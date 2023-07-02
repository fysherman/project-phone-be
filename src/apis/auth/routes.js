const express = require('express')
const { userLogin, userRegister, refreshToken } = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/login', userLogin)
router.post('/register', userRegister)
router.post('/refresh-token', refreshToken)

module.exports = router