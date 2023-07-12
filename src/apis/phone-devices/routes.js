const express = require('express')
const { permit } = require('../../middlewares/permit')
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

router.get('/:deviceId/number-to-call', permit(['device']), getNumberToCall)
router.get('/:deviceId', permit(['user'], ['user', 'admin']), getDevice)
router.patch('/:deviceId', permit(['user'], ['admin']), updateDevice)
router.delete('/:deviceId', permit(['user'], ['admin']), deleteDevice)
router.post('/', permit(['user'], ['admin']), createDevice)
router.get('/', permit(['user'], ['user', 'admin']), getDevices)

module.exports = router