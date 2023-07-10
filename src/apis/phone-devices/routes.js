const express = require('express')
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  getNumberToCall,
  deleteDevice
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:deviceId/number-to-call', getNumberToCall)
router.get('/:deviceId', getDevice)
router.patch('/:deviceId', updateDevice)
router.delete('/:deviceId', deleteDevice)
router.post('/', createDevice)
router.get('/', getDevices)

module.exports = router