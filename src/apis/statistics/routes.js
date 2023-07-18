const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getStatistics
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/', permit(['user'], ['admin', 'user']), getStatistics)

module.exports = router