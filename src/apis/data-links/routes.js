const express = require('express')
const { permit } = require('../../middlewares/permit')
const {
  getLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink
} = require('./controllers')

const router = express.Router({
  caseSensitive: true,
})

router.get('/:linkId', permit(['user', 'device'], ['user', 'admin']), getLink)
router.patch('/:linkId', permit(['user'], ['admin']), updateLink)
router.delete('/:linkId', permit(['user'], ['admin']), deleteLink)
router.post('/', permit(['user'], ['admin']), createLink)
router.get('/', permit(['user', 'device'], ['user', 'admin']), getLinks)

module.exports = router