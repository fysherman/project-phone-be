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
    const {
      offset,
      limit,
      q,
      type,
      from,
      to,
      device_id
    } = value

    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      ...(type ? { type } : { type: { $in: ['call', 'answer'] } }),
      ...(q && { $or: [{ call_number: regex }, { answer_number: regex }] }),
      ...(device_id && { device_id }),
      ...(from && to && { 
        created_at: {
          $gte: dayjs(from).startOf('day').valueOf(),
          $lte: dayjs(to).endOf('day').valueOf()
        }
      })
    }

    const [data, total] = await Promise.all([
      collection
        .find(filter)
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

    const startOfDay = dayjs().startOf('day').valueOf()
    const [[report]] = await Promise.all([
      db.collection('call-reports').findOne({ created_at: startOfDay }),
      db.collection('histories').insertOne({
        ...value,
        device_id: deviceId,
        created_at: Date.now()
      }),
      db.collection('logs').deleteMany({
        device_id: deviceId
      }),
    ])

    if (device.type === 'call') {
      const payload = {
        [`by_networks.${device.network_id || 'unknown'}.time`]: duration,
        [`by_networks.${device.network_id || 'unknown'}.total`]: 1,
        [`by_stations.${device.station_id || 'unknown'}.time`]: duration,
        [`by_stations.${device.station_id || 'unknown'}.total`]: 1,
      }

      if (
        !report
      ) {
        await db.collection('call-reports').insertOne({
          created_at: startOfDay
        })
      }
      await db.collection('call-reports').updateOne(
        {
          created_at: startOfDay
        },
        {
          $inc: payload
        }
      )
    }

    res.status(200).send({
      success: true,
    })
  } catch (error) {
    next(error)
  }
}