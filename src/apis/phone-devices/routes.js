const express = require('express')
const { permit } = require('../../middlewares/permit')
const { wakeUp } = require('../../middlewares/wake-up')
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

router.get('/:deviceId/number-to-call', permit(['device']), wakeUp, getNumberToCall)
router.get('/:deviceId', permit(['user'], ['user', 'admin']), getDevice)
router.patch('/:deviceId', permit(['user', 'device'], ['admin']), wakeUp, updateDevice)
router.delete('/:deviceId', permit(['user'], ['admin']), deleteDevice)
router.post('/', permit(['user'], ['admin']), createDevice)
router.get('/', permit(['user'], ['user', 'admin']), getDevices)

module.exports = router