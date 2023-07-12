const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getStations,
  getStation,
  createStation,
  updateStation,
  deleteStation
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:stationId', permit(['user'], ['admin', 'user']), getStation)
router.patch('/:stationId', permit(['user'], ['admin']), updateStation)
router.delete('/:stationId', permit(['user'], ['admin']), deleteStation)
router.post('/', permit(['user'], ['admin']), createStation)
router.get('/', permit(['user'], ['admin', 'user']), getStations)

module.exports = router