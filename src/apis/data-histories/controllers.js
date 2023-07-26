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
    const {
      offset,
      limit,
      q,
      from,
      to,
      device_id
    } = value
    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      type: 'data',
      status: { $in: ['failed', 'finished'] },
      ...(q && { url: regex }),
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

    const startOfDay = dayjs().startOf('day').valueOf()
    const [[report]] = await Promise.all([
      db.collection('download-reports').findOne({ created_at: startOfDay }),
      db.collection('histories').insertOne({
        type: 'data',
        ...value,
        device_id: deviceId,
        created_at: Date.now()
      }),
      db.collection('logs').deleteMany({
        device_id: deviceId
      }),
    ])

    const payload = {
      [`by_stations.${device.station_id || 'unknown'}.size`]: size || 0,
      [`by_stations.${device.station_id || 'unknown'}.total`]: 1,
    }

    if (
      !report
    ) {
      await db.collection('download-reports').insertOne({
        created_at: startOfDay
      })
    }

    await db.collection('download-reports').updateOne(
      {
        created_at: startOfDay
      },
      {
        $inc: payload
      }
    )

    res.status(200).send({
      success: true,
    })
  } catch (error) {
    next(error)
  }
}