const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  updateCallConfig,
  getCallConfig,
  updateDataConfig,
  getDataConfig
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.patch('/call-config', permit(['user'], ['admin']), updateCallConfig)
router.patch('/data-config', permit(['user'], ['admin']), updateDataConfig)
router.get('/call-config', permit(['user'], ['admin', 'user']), getCallConfig)
router.get('/data-config', permit(['user'], ['admin', 'user']), getDataConfig)

module.exports = router