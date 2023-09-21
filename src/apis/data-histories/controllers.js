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
    const { _id, role } = req
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
      ...(role === 'user' && { 'station.assign_id': _id }),
      ...(q && { url: regex }),
      ...(device_id && { device_id }),
      ...(from && to && { 
        created_at: {
          $gte: dayjs(from).startOf('day').valueOf(),
          $lte: dayjs(to).endOf('day').valueOf()
        }
      })
    }

    const totalData = await collection.aggregate([
      {
        $lookup: {
          from: 'devices',
          let: { id: { $convert: { input: '$device_id', to: 'objectId', onError: '' } } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    '$_id',
                    '$$id'
                  ]
                }
              }
            },
            { $project: { _id: 1, station_id: 1, name: 1 } }
          ],
          as: 'device',
        }
      },
      {
        $addFields: { device: { $first: '$device' } }
      },
      ...(role === 'user' ? [
        {
          $lookup: {
            from: 'stations',
            let: { id: { $convert: { input: '$device.station_id', to: 'objectId', onError: '' } } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      '$_id',
                      '$$id'
                    ]
                  }
                }
              },
              { $project: { _id: 1, assign_id: 1 } }
            ],
            as: 'station',
          }
        },
        {
          $addFields: { station: { $first: '$station' } }
        }
      ] : []),
      {
        $match: filter
      },
      {
        $sort: { created_at: -1 }
      },
      {
        $project: { station: 0 }
      }
    ]).toArray()

    const startInd = offset === 1 ? 0 : (offset - 1) * limit

    res.status(200).send({
      total: totalData.length,
      offset,
      limit,
      data: totalData.slice(startInd, startInd + limit)
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

    const startOfDay = dayjs().add(7, 'h').startOf('day').valueOf()
    const [report] = await Promise.all([
      db.collection('download-reports').findOne({ created_at: startOfDay }),
      db.collection('histories').insertOne({
        ...value,
        type: 'data',
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