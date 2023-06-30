const express = require('express')
const {
  updateCallConfig,
  getCallConfig,
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.patch('/call-config', updateCallConfig)
router.get('/call-config', getCallConfig)

module.exports = router