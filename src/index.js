const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors')
const connectDb = require('./database')
const connectRedis = require('./redis')
const app = express()
const port = 3000
const apis = require('./apis/index')
const { handleError, handleNotFound } = require('./middlewares/error-handler')

require('dotenv').config()
require('./cron-job')

connectDb()
connectRedis()

app.use(helmet())

app.use(cors())

// parse json request body
app.use(express.json())

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }))

// logger
morgan.token('msg', function(req, res) {
  return res?.statusMessage || ''
})
morgan.token('params', function(req, res) {
  return JSON.stringify(req.params)
})
morgan.token('query', function(req, res) {
  return JSON.stringify(req.params)
})
morgan.token('body', function(req, res) {
  return JSON.stringify(req.body)
})

app.use(morgan(':method :url - :params :query :body - :status :msg - :response-time ms - :date'))

app.use('/api', apis)

app.use(handleNotFound)

app.use(handleError)

app.listen(port, () => {
  try {
    console.log(`Listening on port ${port}`)
  } catch (error) {
    console.log(error)
    process.exit()
  }
})