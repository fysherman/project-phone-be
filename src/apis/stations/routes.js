const express = require('express')
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

router.get('/:stationId', getStation)
router.patch('/:stationId', updateStation)
router.delete('/:stationId', deleteStation)
router.post('/', createStation)
router.get('/', getStations)

module.exports = router