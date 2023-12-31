const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getUsers,
  getUser,
  updateUser
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/', permit(['user'], ['admin']), getUsers)
router.get('/:userId', permit(['user'], ['admin']), getUser)
router.patch('/:userId', permit(['user'], ['admin']), updateUser)

module.exports = router