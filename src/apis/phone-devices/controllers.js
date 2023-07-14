const { ObjectId } = require('mongodb')
const { randomInRange } = require('../../utils/helpers')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getDevicesSchema,
  createDeviceSchema, 
  updateDeviceSchema,
} = require('../../models/phone-devices')

exports.getDevices = async (req, res, next) => {
  try {
    const { value, error } = getDevicesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('devices')
    const { offset, limit, type, q } = value
    const regex = new RegExp(`${q}`, 'ig')

    let [data, total] = await Promise.all([
      collection.aggregate([
        {
          $match: {
            ...(q && { $or: [{ name: regex }, { phone_number: regex }] }),
            ...(type ? { type } : { type: { $in: ['call', 'answer'] }})
          }
        },
        {
          $lookup: {
            from: 'networks',
            let: { id: { $convert: { input: '$network_id', to: 'objectId', onError: '' } } },
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
              { $project: { _id: 1, name: 1 } }
            ],
            as: 'network',
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
            phone_number: 1,
            phone_report: 1,
            network_id: 1,
            station_id: 1,
            is_active: 1,
            status: 1,
            created_at: 1,
            network: { $first: '$network' },
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
      collection.countDocuments({ 
        ...(type ? { type } : { type: { $in: ['call', 'answer'] }})
      })
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
          _id: new ObjectId(req.params.deviceId),
          type: { $in: ['call', 'answer'] }
        }
      },
      {
        $lookup: {
          from: 'networks',
          let: { id: { $convert: { input: '$network_id', to: 'objectId', onError: '' } } },
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
            { $project: { _id: 1, name: 1 } }
          ],
          as: 'network',
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
          phone_number: 1,
          phone_report: 1,
          network_id: 1,
          station_id: 1,
          is_active: 1,
          status: 1,
          created_at: 1,
          network: { $first: '$network' },
          station: { $first: '$station' },
        }
      },
      {
        $sort: { created_at: -1 }
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
    const { name, phone_number, station_id, network_id } = value

    const existDevice = await collection.findOne({
      type: { $in: ['call', 'answer'] },
      $or: [{ name }, { phone_number }]
    })

    if (existDevice) {
      throw new ApiError(400, `${existDevice.name === name ? 'Tên' : 'Số điện thoại'} đã tồn tại`)
    }

    const station = await db.collection('stations').findOne({ _id: new ObjectId(station_id) })

    if (!station) {
      throw new ApiError(400, 'Không tìm thấy trạm')
    }

    const network = await db.collection('networks').findOne({ _id: new ObjectId(network_id) })

    if (!network) {
      throw new ApiError(400, 'Nhà mạng tìm thấy nhà mạng')
    }

    await Promise.all([
      collection.insertOne({
        ...value,
        is_active: false,
        status: 'offline',
        location: {},
        call_time: 0,
        created_at: Date.now()
      }),
      db.collection('phone-reports').updateMany(
        {
          $or: [{ type: 'summary' }, { type: 'station', station_id: station._id.toString() }]
        },
        {
          $inc: {
            total: 1,
            [`by_networks.${network._id.toString()}`]: 1,
            ...(value.type === 'call' ? { call_devices: 1 } : { answer_devices: 1 }),
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
    const { name, phone_number, network_id, station_id } = value

    const existDevice = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.deviceId) },
      $or: [{ name }, { phone_number }],
      type: { $in: ['call', 'answer'] },
    })

    if (existDevice) {
      throw new ApiError(400, `${existDevice.name === name ? 'Tên' : 'Số điện thoại'} đã tồn tại`)
    }

    const device = await collection.findOne({ _id: new ObjectId(req.params.deviceId) })

    if (station_id) {
      const station = await db.collection('stations').findOne({ _id: new ObjectId(station_id) })

      if (!station) {
        throw new ApiError(400, 'Không tìm thấy trạm')
      }
    }

    if (network_id) {
      const network = await db.collection('networks').findOne({ _id: new ObjectId(network_id) })

      if (!network) {
        throw new ApiError(400, 'Nhà mạng tìm thấy trạm')
      }
    }

    const [{ value: modified }] = await Promise.all([
      collection.findONeAndUpdate(
        {
          _id: new ObjectId(req.params.deviceId)
        },
        {
          $set: {
            ...value,
            updated_at: Date.now()
          }
        },
        {
          returnDocument: 'after'
        }
      ),
      ...(network_id && network_id !== device.network_id
        ? db.collection('phone-reports').updateMany(
          {
            $or: [{ type: 'summary' }, { type: 'station', station_id: device.station_id }]
          },
          {
            $inc: {
              [`by_networks.${device.network_id}`]: -1,
              [`by_networks.${network_id}`]: 1,
            }
          }
        )
        : [true]
      )
    ])

    if (!modified) throw new Error()

    if (modified.station_id !== device.station_id) {
      await Promise.all([
        db.collection('phone-reports').updateOne(
          {
            type: 'station', station_id: device.station_id
          },
          {
            $inc: {
              total: -1,
              [`by_networks.${modified.network_id}`]: -1,
              ...(modified.type === 'call' ? { call_devices: -1 } : { answer_devices: -1 }),
              ...(modified.status === 'offline' && { offline_devices: -1 })
            }
          }
        ),
        db.collection('phone-reports').updateOne(
          {
            type: 'station', station_id: modified.station_id
          },
          {
            $inc: {
              total: 1,
              [`by_networks.${modified.network_id}`]: 1,
              ...(modified.type === 'call' ? { call_devices: 1 } : { answer_devices: 1 }),
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

    await db.collection('phone-reports').updateMany(
      {
        $or: [{ type: 'summary' }, { type: 'station', station_id: value.station_id }]
      },
      {
        $inc: {
          total: -1,
          [`by_networks.${value.network_id}`]: -1,
          ...(value.type === 'call' ? { call_devices: -1 } : { answer_devices: -1 }),
          ...(value.status === 'offline' && { offline_devices: -1 }),
          ...(value.status === 'calling' && { calling_devices: -1 }),
        }
      }
    )

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.getNumberToCall = async (req, res, next) => {
  try {
    const deviceId = req._id

    if (deviceId !== req.params.deviceId) {
      throw new ApiError(404, 'Device không khớp')
    }

    const db = await connectDb()
    const collection = await db.collection('devices')

    const device = await collection.findOne({ _id: new ObjectId(deviceId) })

    if (!device) {
      throw new ApiError(404, 'Không tìm thấy thiết bị')
    }
    if (!device.is_active) {
      throw new ApiError(400, 'Thiết bị chưa kích hoạt')
    }
    if (device.type !== 'call') {
      throw new ApiError(400, 'Thiết bị không phải thiết bị gọi')
    }
    if (device.status !== 'running') {
      throw new ApiError(400, 'Thiết bị đang không ở trạng thái rảnh')
    }

    const config = await db.collection('configs').findOne({ type: 'call-config' })

    if (!config) throw new ApiError(500, 'Lỗi config')

    const [answerDevice] = await collection.aggregate([
      { 
        $match: {
          type: 'answer',
          is_active: true,
          status: 'running',
          network_id: device.network_id
        },
      },
      {
        $sort: { work_time: 1 }
      },
      {
        $limit: 1
      },
      {
        $set: { status: 'calling' }
      }
    ])

    if (!answerDevice) {
      throw new ApiError(404, 'Không tìm thấy thiết bị nghe rảnh')
    }

    const { modifiedCount } = await collection.updateOne(
      { _id: new ObjectId(deviceId)},
      {
        $set: {
          status: 'calling'
        }
      }
    )

    if (!modifiedCount) throw new Error()

    const callDuration = Math.floor(randomInRange(config.duration.min, config.duration.max))
    const callDelay = Math.floor(randomInRange(config.delay.min, config.delay.max))

    await Promise.all([
      db.collection('logs').insertMany([
        {
          type: 'call',
          device_id: deviceId,
          duration: callDuration,
          created_at: Date.now()
        },
        {
          type: 'answer',
          device_id: answerDevice._id.toString(),
          duration: callDuration,
          created_at: Date.now()
        },
      ]),
      db.collection('phone-reports').updateMany(
        {
          $or: [{ type: 'summary' }, { type: 'station', station_id: device.station_id }, { type: 'station', station_id: answerDevice.station_id }]
        },
        {
          $inc: {
            calling_devices: 2,
            [`by_networks.${device.network_id}.calling_devices`]: 2,
          }
        }
      )
    ])

    res.status(200).send({ 
      phone_number: answerDevice.phone_number,
      duration: callDelay,
      delay: callDelay,
    })
  } catch (error) {
    next(error)
  }
}
