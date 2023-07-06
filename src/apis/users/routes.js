const express = require('express')
const {
  getUsers,
  getUser
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/', getUsers)
router.get('/:userId', getUser)

module.exports = router