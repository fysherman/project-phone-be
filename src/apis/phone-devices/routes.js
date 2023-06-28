const express = require('express')
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:deviceId', getDevice)
router.patch('/:deviceId', updateDevice)
router.post('/', createDevice)
router.get('/', getDevices)

module.exports = router