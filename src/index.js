const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const connectDb = require('./database')
const app = express()
const port = 3000
const apis = require('./apis/index')
const { handleError, handleNotFound } = require('./middlewares/error-handler')

require('dotenv').config()

connectDb()

app.use(helmet())
app.use(morgan('tiny'))

// parse json request body
app.use(express.json())

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }))

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