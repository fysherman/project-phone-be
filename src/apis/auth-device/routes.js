const express = require('express')
const { authenticateToken } = require('../../middlewares/auth')
const {
  createOtp,
  activeDevice,
  refreshToken,
  deactivateDevice
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.post('/active', activeDevice)
router.post('/refresh-token', refreshToken)
router.post('/create-otp', authenticateToken, createOtp)
router.post('/deactivate', authenticateToken, deactivateDevice)

module.exports = router