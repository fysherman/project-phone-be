const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getHistories,
  createHistory
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/:deviceId', permit(['device']), createHistory)
router.get('/', permit(['user', ['user', 'admin']]), getHistories)

module.exports = router