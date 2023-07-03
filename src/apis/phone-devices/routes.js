const express = require('express')
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  createOtp,
  activeDevice,
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/:deviceId/active', activeDevice)
router.post('/:deviceId/otp', createOtp)
router.get('/:deviceId', getDevice)
router.patch('/:deviceId', updateDevice)
router.post('/', createDevice)
router.get('/', getDevices)

module.exports = router