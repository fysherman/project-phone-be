const express = require('express')
const { permit } = require('../../middlewares/permit')
const { serveCache } = require('../../middlewares/cache')
const { sortObjectKeys, objectToString } = require('../../utils/helpers')
const {
  getStatistics,
  getActivityStatistics
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get(
  '/',
  permit(['user'], ['admin', 'user']),
  ({ _id }, res, next) => {
    serveCache(`statistics:${_id}`, res, next)
  },
  getStatistics
)

router.get(
  '/activities',
  permit(['user'], ['admin', 'user']),
  ({ _id, query }, res, next) => {
    serveCache(`statistic_activities:${_id}:${objectToString(sortObjectKeys(query))}`, res, next)
  },
  getActivityStatistics
)

module.exports = router