const { ObjectId } = require('mongodb')
const dayjs = require('dayjs')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getDataHistoriesSchema,
  updateDataHistoriesSchema
} = require('../../models/data-histories')

exports.getHistories = async (req, res, next) => {
  try {
    const { value, error } = getDataHistoriesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('histories')
    const { offset, limit } = value

    const [data, total] = await Promise.all([
      collection
        .find({
          type: 'data'
        })
        .sort({ _id: -1 })
        .skip(offset === 1 ? 0 : (offset - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments({ type: 'data' })
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

exports.updateHistory = async (req, res, next) => {
  try {
    const { value, error } = updateDataHistoriesSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const { size, status } = value
    const deviceId = req.params.deviceId

    if (status === 'continue') {
      await db.collection('logs').updateMany(
        {
          device_id: deviceId,
        },
        {
          $set: { updated_at: Date.now() }
        }
      )

      res.status(200).send({ success: true })
      return
    }

    const { value: device } = await db.collection('devices').findOneAndUpdate(
      {
        _id: new ObjectId(deviceId)
      },
      {
        $set: {
          status: 'running'
        },
        $inc: {
          size_downloaded: size || 0
        }
      }
    )

    if (!device) throw new ApiError(500)

    const [[report]] = await Promise.all([
      db.collection('download-reports').aggregate([
        {
          $sort: { created_at: -1 }
        },
        {
          $limit: 1
        }
      ]).toArray(),
      db.collection('histories').insertOne({
        type: 'data',
        ...value,
        created_at: Date.now()
      }),
      db.collection('logs').deleteMany({
        device_id: deviceId
      }),
    ])

    const payload = {
      size: size || 0,
      total: 1,
      ...(device.station_id && {
        [`by_stations.${device.station_id}.time`]: size || 0,
        [`by_stations.${device.station_id}.total`]: 1,
      })
    }
    const startOfDay = dayjs().hour(0).minute(0).second(0).millisecond(0).valueOf()

    if (
      !report
      || dayjs().isAfter(dayjs(report.created_at), 'day')
    ) {
      await db.collection('download-reports').insertOne({
        ...payload,
        created_at: startOfDay
      })
    } else {

      await db.collection('download-reports').updateOne(
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