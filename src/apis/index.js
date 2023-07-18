const express = require('express')
const { authenticateToken } = require('../middlewares/auth')
const auth = require('./auth/routes')
const authDevice = require('./auth-device/routes')
const phoneDevices = require('./phone-devices/routes')
const dataDevices = require('./data-devices/routes')
const stations = require('./stations/routes')
const networks = require('./networks/routes')
const phoneHistories = require('./phone-histories/routes')
const dataHistories = require('./data-histories/routes')
const configs = require('./configs/routes')
const dataLinks = require('./data-links/routes')
const users = require('./users/routes')
const statistics = require('./statistics/routes')
const app = express()

const routes = {
  '/auth': [auth],
  '/auth-device': [authDevice],
  '/phone-devices': [authenticateToken, phoneDevices],
  '/data-devices': [authenticateToken, dataDevices],
  '/stations': [authenticateToken, stations],
  '/networks': [authenticateToken, networks],
  '/phone-histories': [authenticateToken, phoneHistories],
  '/data-histories': [authenticateToken, dataHistories],
  '/data-links': [authenticateToken, dataLinks],
  '/configs': [authenticateToken, configs],
  '/users': [authenticateToken, users],
  '/statistics': [authenticateToken, statistics],
}

Object.entries(routes).forEach(([route, handlers]) => {
  app.use(route, ...handlers)
})

module.exports = app