const { verifyJwt } = require('../utils/token')

exports.authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')?.[1]

    if (!token) return res.status(401).send({ error: 'Unauthorized' })

    const { _id, token_type, role } = await verifyJwt(token)

    req._id = _id
    req.token_type = token_type
    req.role = role

    next()
  } catch {
    res.status(401).send({ error: 'Unauthorized' })
  }
}