const { ObjectId } = require('mongodb')
const dayjs = require('dayjs')
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

    const { value: device } = await db.collection('devices').findOneAndUpdate(
      {
        _id: new ObjectId(deviceId)
      },
      {
        $set: {
          status: 'running'
        },
        $inc: {
          call_time: duration
        }
      }
    )

    if (!device) throw new ApiError(500)

    const [[report]] = await Promise.all([
      db.collection('call-reports').aggregate(
        {
          $sort: { created_at: -1 }
        },
        {
          $limit: 1
        }
      ),
      db.collection('histories').insertOne({
        ...value,
        created_at: Date.now()
      }),
      db.collection('logs').deleteMany({
        device_id: deviceId
      }),
      db.collection('phone-reports').updateOne(
        {},
        {
          $inc: {
            calling_devices: -1,
          }
        }
      )
    ])

    if (device.type === 'call') {
      const payload = {
        time: duration,
        total: 1,
        [`by_networks.${device.network_id}.time`]: duration,
        [`by_networks.${device.network_id}.total`]: 1
      }
      if (
        !report
        || dayjs().isAfter(dayjs(report.created_at), 'day')
      ) {
        await db.collection('call-reports').insertOne({
          ...payload,
          created_at: Date.now()
        })
      } else {
        const startOfDay = dayjs().hour(0).minute(0).second(0).millisecond(0).valueOf()

        await db.collection('call-reports').updateOne(
          {
            created_at: { $gte: startOfDay }
          },
          {
            $inc: payload
          }
        )
      }
    }

    res.status(200).send({
      success: true,
    })
  } catch (error) {
    next(error)
  }
}