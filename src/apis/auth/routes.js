const express = require('express')
const { authenticateToken } = require('../../middlewares/auth')
const {
  userLogin,
  userRegister,
  refreshToken,
  getUserInfo
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/get-info', authenticateToken, getUserInfo)
router.post('/login', userLogin)
router.post('/register', userRegister)
router.post('/refresh-token', refreshToken)

module.exports = router