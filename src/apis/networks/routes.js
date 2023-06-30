const express = require('express')
const {
  getNetworks,
  getNetwork,
  createNetwork,
  updateNetwork
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:networkId', getNetwork)
router.patch('/:networkId', updateNetwork)
router.post('/', createNetwork)
router.get('/', getNetworks)

module.exports = router