const express = require('express')
const {
  getHistories,
  createHistory
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/', createHistory)
router.get('/', getHistories)

module.exports = router