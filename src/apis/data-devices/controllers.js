const { ObjectId } = require('mongodb')
const { randomInRange } = require('../../utils/helpers')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getDevicesSchema,
  createDeviceSchema, 
  updateDeviceSchema,
  startDownloadSchema
} = require('../../models/data-devices')

exports.getDevices = async (req, res, next) => {
  try {
    const { value, error } = getDevicesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('devices')
    const { offset, limit, q } = value
    const regex = new RegExp(`${q}`, 'ig')

    let [data, total] = await Promise.all([
      collection.aggregate([
        {
          $match: {
            type: 'data',
            ...(q && { $or: [{ name: regex }, { phone_number: regex }] }),
          }
        },
        {
          $lookup: {
            from: 'stations',
            let: { id: { $convert: { input: '$station_id', to: 'objectId', onError: '' } } },
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
              { $project: { _id: 1, code: 1, name: 1 } }
            ],
            as: 'station',
          }
        },
        {
          $project: {
            _id: 1,
            type: 1,
            name: 1,
            station_id: 1,
            is_active: 1,
            status: 1,
            created_at: 1,
            station: { $first: '$station' },
          }
        },
        {
          $sort: { created_at: -1 }
        },
        {
          $skip: offset === 1 ? 0 : (offset - 1) * limit
        },
        {
          $limit: limit
        }
      ]).toArray(),
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

exports.getDevice = async (req, res, next) => {
  try {
    const db = await connectDb()

    let [data] = await db.collection('devices').aggregate([
      {
        $match: {
          _id: new ObjectId(req.params.deviceId)
        }
      },
      {
        $lookup: {
          from: 'stations',
          let: { id: { $convert: { input: '$station_id', to: 'objectId', onError: '' } } },
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
            { $project: { _id: 1, code: 1, name: 1 } }
          ],
          as: 'station',
        }
      },
      {
        $project: {
          _id: 1,
          type: 1,
          name: 1,
          station_id: 1,
          is_active: 1,
          status: 1,
          created_at: 1,
          station: { $first: '$station' },
        }
      },
      {
        $limit: 1
      }
    ]).toArray()

    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
}

exports.createDevice = async (req, res, next) => {
  try {
    const { value, error } = createDeviceSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('devices')
    const { name, station_id } = value

    const existDevice = await collection.findOne({
      type: 'data',
      name
    })

    if (existDevice) {
      throw new ApiError(400, 'Tên đã tồn tại')
    }

    const station = await db.collection('stations').findOne({ _id: new ObjectId(station_id) })

    if (!station) {
      throw new ApiError(400, 'Không tìm thấy trạm')
    }

    await Promise.all([
      collection.insertOne({
        ...value,
        type: 'data',
        is_active: false,
        status: 'offline',
        size_downloaded: 0,
        created_at: Date.now()
      }),
      db.collection('data-reports').updateMany(
        {
          $or: [{ type: 'summary' }, { type: 'station', station_id: station._id.toString() }]
        },
        {
          $inc: {
            total: 1,
            offline_devices: 1
          }
        }
      )
    ])

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.updateDevice = async (req, res, next) => {
  try {
    const { value, error } = updateDeviceSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('devices')
    const { name, station_id } = value

    const existDevice = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.deviceId) },
      type: 'data',
      name
    })

    if (existDevice) {
      throw new ApiError(400, 'Tên đã tồn tại')
    }

    const device = await collection.findOne({ _id: new ObjectId(req.params.deviceId) })

    if (station_id) {
      const station = await db.collection('networks').findOne({ _id: new ObjectId(station_id) })

      if (!station) {
        throw new ApiError(400, 'Nhà mạng tìm thấy trạm')
      }
    }

    const [{ value: modified }] = await Promise.all([
      collection.updateOne(
        {
          _id: new ObjectId(req.params.deviceId)
        },
        {
          $set: {
            ...value,
            updated_at: Date.now()
          }
        }
      ),
    ])

    if (!modified) throw new Error()

    if (modified.station_id !== device.station_id) {
      await Promise.all([
        db.collection('data-reports').updateOne(
          {
            type: 'station', station_id: device.station_id
          },
          {
            $inc: {
              total: -1,
              ...(modified.status === 'working' && { working_devices: -1 }),
              ...(modified.status === 'offline' && { offline_devices: -1 })
            }
          }
        ),
        db.collection('data-reports').updateOne(
          {
            type: 'station', station_id: modified.station_id
          },
          {
            $inc: {
              total: 1,
              ...(modified.status === 'working' && { working_devices: 1 }),
              ...(modified.status === 'offline' && { offline_devices: 1 })
            }
          }
        )
      ])
    }

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.deleteDevice = async (req, res, next) => {
  try {
    const db = await connectDb()

    const { value } = await db.collection('devices').findOneAndDelete({ _id: new ObjectId(req.params.deviceId) })

    if (!value) throw new ApiError()

    await db.collection('data-reports').updateMany(
      {
        $or: [{ type: 'summary' }, { type: 'station', station_id: value.station_id }]
      },
      {
        $inc: {
          total: -1,
          ...(value.status === 'offline' && { offline_devices: -1 }),
          ...(value.status === 'working' && { working_devices: -1 }),
        }
      }
    )

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.startDownload = async (req, res, next) => {
  try {
    const deviceId = req._id

    const { value, error } = startDownloadSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('devices')

    const device = await collection.findOne({ _id: new ObjectId(deviceId) })

    if (!device) {
      throw new ApiError(404, 'Không tìm thấy thiết bị')
    }
    if (!device.is_active) {
      throw new ApiError(400, 'Thiết bị chưa kích hoạt')
    }
    if (device.type !== 'data') {
      throw new ApiError(400, 'Thiết bị không phải thiết bị download')
    }
    if (device.status !== 'running') {
      throw new ApiError(400, 'Thiết bị đang không ở trạng thái rảnh')
    }

    const config = await db.collection('configs').findOne({ type: 'data-config' })

    if (!config) throw new ApiError(500, 'Lỗi config')

    const { modifiedCount } = await collection.updateOne(
      { _id: new ObjectId(deviceId)},
      {
        $set: {
          status: 'working'
        }
      }
    )

    if (!modifiedCount) throw new Error()

    const downloadDelay = Math.floor(randomInRange(config.delay.min, config.delay.max))

    await Promise.all([
      db.collection('logs').insertMany([
        {
          type: 'data',
          url: value.url,
          device_id: deviceId,
          created_at: Date.now(),
          updated_at: Date.now()
        },
      ]),
      db.collection('data-reports').updateMany(
        {
          $or: [{ type: 'summary' }, { type: 'station', station_id: device.station_id }]
        },
        {
          $inc: {
            working_devices: 1,
          }
        }
      )
    ])

    res.status(200).send({ 
      delay: downloadDelay,
    })
  } catch (error) {
    next(error)
  }
}
