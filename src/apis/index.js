const express = require('express')
const { authenticateToken } = require('../middlewares/auth')
const auth = require('./auth/routes')
const phoneDevices = require('./phone-devices/routes')
const stations = require('./stations/routes')
const networks = require('./networks/routes')
const phoneHistories = require('./phone-histories/routes')
const configs = require('./configs/routes')
const users = require('./users/routes')
const app = express()

const routes = {
  '/auth': [auth],
  '/phone-devices': [authenticateToken, phoneDevices],
  '/stations': [authenticateToken, stations],
  '/networks': [authenticateToken, networks],
  '/phone-histories': [authenticateToken, phoneHistories],
  '/configs': [authenticateToken, configs],
  '/users': [authenticateToken, users],
}

Object.entries(routes).forEach(([route, handlers]) => {
  app.use(route, ...handlers)
})

module.exports = app