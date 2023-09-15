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
    const { role, _id } = req
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
      ...(role === 'user' && { 'station.assign_id': _id }),
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

exports.createHistory = async (req, res, next) => {
  try {
    const { value, error } = createPhoneHistoriesSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const { duration } = value
    const deviceId = req.params.deviceId

    const startOfDay = dayjs().startOf('day').valueOf()
    const [{ value: deletedLog }, report] = await Promise.all([
      db.collection('logs').findOneAndDelete({
        device_id: deviceId
      }),
      db.collection('call-reports').findOne({ created_at: startOfDay }),
      db.collection('histories').insertOne({
        ...value,
        device_id: deviceId,
        created_at: Date.now()
      })
    ])

    console.log('-----')
    console.log('history log deleted', deletedLog)
    console.log('-----')

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