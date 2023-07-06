const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { getUsersSchema } = require('../../models/users')

exports.getUsers = async function(req, res, next) {
  try {
    const { value, error } = getUsersSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('users')
    const { offset, limit, q } = value
    const regex = new RegExp(`${q}`, 'ig')

    const [data, total] = await Promise.all([
      collection
        .find({ ...(q && { $or: [{ email: regex }, { username: regex }] }) })
        .sort({ _id: -1 })
        .skip(offset === 1 ? 0 : (offset - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments({})
    ])

    res.status(200).send({
      total,
      offset,
      limit,
      data
    })
  } catch (error) {
    next(error)
  }
}

exports.getUser = async (req, res, next) => {
  try {
    const db = await connectDb()
    const data = await db.collection('users').findOne({ _id: new ObjectId(req.params.userId) })

    res.status(200).send(data ?? {})
  } catch (error) {
    next(error)
  }
}
