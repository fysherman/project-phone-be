const { verifyJwt } = require('../utils/token')

exports.authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')?.[1]

    if (!token) return res.status(401).send({ error: 'Unauthorized' })

    const { _id } = await verifyJwt(token)

    req.user_id = _id

    next()
  } catch {
    res.status(401).send({ error: 'Unauthorized' })
  }
}