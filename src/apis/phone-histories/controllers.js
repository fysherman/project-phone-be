const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getPhoneHistoriesSchema,
  createPhoneHistoriesSchema
} = require('../../models/phone-histories')

exports.getHistories = async (req, res, next) => {
  try {
    const { value, error } = getPhoneHistoriesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('histories')
    const { offset, limit, call_number, answer_number, type } = value

    const [data, total] = await Promise.all([
      collection
        .find({
          ...(type && { type }),
          ...(call_number && { call_number }),
          ...(answer_number && { answer_number })
        })
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

exports.createHistory = async (req, res, next) => {
  try {
    const { value, error } = createPhoneHistoriesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()

    await db.collection('histories').insertOne({
      ...value,
      created_at: Date.now()
    })

    res.status(200).send({
      success: true,
    })
  } catch (error) {
    next(error)
  }
}