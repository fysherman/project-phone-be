const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  updateCallConfig,
  getCallConfig,
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.patch('/call-config', permit(['user'], ['admin']), updateCallConfig)
router.get('/call-config', permit(['user'], ['admin', 'user']), getCallConfig)

module.exports = router