const express = require('express')
const {
  getNetworks,
  getNetwork,
  createNetwork,
  updateNetwork,
  deleteNetwork
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:networkId', getNetwork)
router.patch('/:networkId', updateNetwork)
router.delete('/:networkId', deleteNetwork)
router.post('/', createNetwork)
router.get('/', getNetworks)

module.exports = router