const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getStatistics,
  getActivityStatistics
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/', permit(['user'], ['admin', 'user']), getStatistics)
router.get('/activities', permit(['user'], ['admin', 'user']), getActivityStatistics)

module.exports = router