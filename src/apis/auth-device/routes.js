const express = require('express')
const { authenticateToken } = require('../../middlewares/auth')
const { permit } = require('../../middlewares/permit')
const {
  createOtp,
  activeDevice,
  refreshToken,
  deactivateDevice,
  getInfo
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/active', activeDevice)
router.post('/refresh-token', refreshToken)
router.post('/create-otp', authenticateToken, createOtp)
router.post('/deactivate', authenticateToken, deactivateDevice)
router.get('/get-info', authenticateToken, permit(['device']), getInfo)

module.exports = router