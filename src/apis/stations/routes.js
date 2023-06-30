const express = require('express')
const {
  getStations,
  getStation,
  createStation,
  updateStation
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:stationId', getStation)
router.patch('/:stationId', updateStation)
router.post('/', createStation)
router.get('/', getStations)

module.exports = router