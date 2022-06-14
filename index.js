const express = require('express')
const app = express()

require('dotenv').config()

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const cors = require('cors')
app.use(cors({ optionsSuccessStatus: 200 }))

app.use(express.static('public'))

const mongoose = require('mongoose')
const mongodb = require('mongodb')

mongoose.connect(process.env.MONGO_URI)

const Schema = mongoose.Schema

const logSchema = new Schema(
  {
    description: String,
    duration: Number,
    date: { type: String, required: true }
  },
  { _id: false }
)

const trakerSchema = new Schema({
  username: { type: String, required: true },
  count: Number,
  log: [logSchema]
})

const log = mongoose.model('log', logSchema)
const traker = mongoose.model('traker', trakerSchema)

const CreateAndSaveUser = (newUsername, done) => {
  var newTraker = new traker({ username: newUsername, count: 0 })
  newTraker.save((err, data) => {
    if (err) return console.log(err)
    done(null, data)
  })
}

const takeAllUsers = done => {
  traker.find({}, { username: 1, _id: 1, __v: 1 }, (err, data) => {
    if (err) return console.log(err)
    done(null, data)
  })
}

const getUser = (userId, done) => {
  traker.findById(userId, (err, data) => {
    if (err) return console.log(err)
    done(null, data)
  })
}

const addNewExercise = (userId, exercise, done) => {
  getUser(userId, (err, data) => {
    if (err) return console.log(err)
    data.log.push(exercise)
    data.count = data.count + 1
    data.save((err, newData) => {
      if (err) return console.log
      done(null, newData)
    })
  })
}

const getUserWithDateFilter = (userId, from, to, limit, done) => {
  getUser(userId, (err, data) => {
    if (err) return console.log(err)
    data.log = data.log
      .filter(item => {
        var logDate = new Date(item.date)
        var fromDate = new Date(from)
        var toDate = new Date(to)
        return (
          logDate.getTime() >= fromDate.getTime() &&
          logDate.getTime() <= toDate.getTime()
        )
      })
      .sort((item1, item2) => {
        return new Date(item2.date) - new Date(item1.date)
      })
      .slice(0, limit)
    done(null, data)
  })
}

//HTTPS

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/users', (req, res) => {
  //req.body['username']
  CreateAndSaveUser(req.body['username'], (err, data) => {
    if (err) return console.log(err)
    res.json({
      username: data.username,
      _id: data._id
    })
  })
})

app.get('/api/users', (req, res) => {
  takeAllUsers((err, data) => {
    if (err) return console.log(err)
    res.json(data)
  })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  var Newdate = new Date()
  if (req.body['date']) {
    Newdate = new Date(req.body['date'])
  }
  var exercise = new log({
    description: req.body['description'],
    duration: parseInt(req.body['duration']),
    date: Newdate.toDateString()
  })
  addNewExercise(req.body['_id'], exercise, (err, data) => {
    if (err) console.log(err)
    res.json({
      _id: data._id,
      username: data.username,
      date: exercise.date,
      duration: exercise.duration,
      description: exercise.description
    })
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  if (Object.keys(req.query).length > 0) {
    var { from: from, to: to, limit: limit } = req.query
    limit = parseInt(limit)
    getUserWithDateFilter(req.params._id, from, to, limit, (err, data) => {
      if (err) return console.log(err)
      res.json({
        _id: data._id,
        username: data.username,
        from: from,
        to: to,
        count: data.count,
        log: data.log
      })
    })
  } else {
    getUser(req.params._id, (err, data) => {
      if (err) return console.log(err)
      res.json({
        _id: data._id,
        username: data.username,
        count: data.count,
        log: data.log
      })
    })
  }
})

var listener = app.listen(3000, () => {
  console.log('listening on port ' + listener.address().port)
})
