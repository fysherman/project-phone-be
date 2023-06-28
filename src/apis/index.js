const express = require('express')
const { authenticateToken } = require('../middlewares/auth')
const auth = require('./auth/routes')
const phoneDevices = require('./phone-devices/routes')
const app = express()

const routes = {
  '/auth': [auth],
  '/phone-devices': [authenticateToken, phoneDevices]
}

Object.entries(routes).forEach(([route, handlers]) => {
  app.use(route, ...handlers)
})

module.exports = app