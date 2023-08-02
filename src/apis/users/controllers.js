const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { getUsersSchema, updateUserSchema } = require('../../models/users')

exports.getUsers = async function(req, res, next) {
  try {
    const { value, error } = getUsersSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('users')
    const { offset, limit, q, is_active } = value
    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      ...(q && { $or: [{ email: regex }, { username: regex }] }),
      ...(typeof is_active === 'boolean' && { is_active })
    }

    const [data, total] = await Promise.all([
      collection
        .find(filter, { projection: { refresh_token: 0, password: 0 } })
        .sort({ created_at: -1 })
        .skip(offset === 1 ? 0 : (offset - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter)
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

exports.updateUser = async (req, res, next) => {
  try {
    const { value, error } = updateUserSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const { modifiedCount } = await db.collection('users').updateOne({ _id: new ObjectId(req.params.userId) }, { $set: { is_active: value.is_active } })

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy user')
    }

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}