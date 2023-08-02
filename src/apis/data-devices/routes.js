const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  startDownload
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/:deviceId/start-download', permit(['device']), startDownload)
router.get('/:deviceId', permit(['user'], ['user', 'admin']), getDevice)
router.patch('/:deviceId', permit(['user', 'device'], ['admin']), updateDevice)
router.delete('/:deviceId', permit(['user'], ['admin']), deleteDevice)
router.post('/', permit(['user'], ['admin']), createDevice)
router.get('/', permit(['user'], ['user', 'admin']), getDevices)

module.exports = router