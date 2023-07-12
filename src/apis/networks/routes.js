const express = require('express')
const { permit } = require('../../middlewares/permit')
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

router.get('/:networkId', permit(['user'], ['user', 'admin']), getNetwork)
router.patch('/:networkId', permit(['user'], ['admin']), updateNetwork)
router.delete('/:networkId', permit(['user'], ['admin']), deleteNetwork)
router.post('/', permit(['user'], ['admin']), createNetwork)
router.get('/', permit(['user'], ['user', 'admin']), getNetworks)

module.exports = router