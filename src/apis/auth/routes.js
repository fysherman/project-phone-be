const express = require('express')
const { userLogin, userRegister } = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/login', userLogin)
router.post('/register', userRegister)

module.exports = router