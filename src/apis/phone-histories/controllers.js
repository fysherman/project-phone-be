const { ObjectId } = require('mongodb')
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
    const { value, error } = createPhoneHistoriesSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const { duration } = value
    const deviceId = req.params.deviceId

    await Promise.all([
      db.collection('histories').insertOne({
        ...value,
        created_at: Date.now()
      }),
      db.collection('logs').deleteMany({
        device_id: deviceId
      }),
      db.collection('devices').aggregate([
        {
          $match: {
            _id: new ObjectId(deviceId)
          }
        },
        {
          $set: {
            status: 'running',
            work_time: {
              $add: ['$work_time', duration]
            }
          }
        }
      ])
    ])

    res.status(200).send({
      success: true,
    })
  } catch (error) {
    next(error)
  }
}