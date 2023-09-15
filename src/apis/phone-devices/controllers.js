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
    const { role, _id } = req
    const { value, error } = getDevicesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()

    let assignStationIds = []
    if (role === 'user') {
      await db.collection('stations')
        .find({ assign_id: _id })
        .forEach((doc) => {
          assignStationIds.push(doc._id.toString())
        })
    }

    const collection = await db.collection('devices')
    const {
      offset,
      limit,
      type,
      q,
      is_active,
      status,
      network_id,
      station_id
    } = value
    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      ...(q && { $or: [{ name: regex }, { phone_number: regex }] }),
      ...(type ? { type } : { type: { $in: ['call', 'answer'] }}),
      ...(typeof is_active === 'boolean' && { is_active }),
      ...(status && { status }),
      ...(network_id && { network_id }),
      ...(
        role === 'user'
        && { station_id: { $in: assignStationIds } }
      ),
      ...(station_id && (role === 'admin' || assignStationIds.includes(station_id)) && { station_id }),
    }

    let [data, total] = await Promise.all([
      collection.aggregate([
        {
          $match: filter
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
            call_time: 1,
            location: 1,
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

exports.getDevice = async (req, res, next) => {
  try {
    const { role, _id, params } = req

    const db = await connectDb()

    let assignStationIds = []
    if (role === 'user') {
      await db.collection('stations')
        .find({ assign_id: _id })
        .forEach((doc) => {
          assignStationIds.push(doc._id.toString())
        })
    }

    let [data] = await db.collection('devices').aggregate([
      {
        $match: {
          _id: new ObjectId(params.deviceId),
          ...(
            role === 'user'
            && { station_id: { $in: assignStationIds } }
          )
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
          call_time: 1,
          location: 1,
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

    await  collection.insertOne({
      ...value,
      is_active: false,
      status: 'offline',
      location: {},
      call_time: 0,
      created_at: Date.now()
    })

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

    const { modifiedCount } = await collection.updateOne(
      {
        _id: new ObjectId(req.params.deviceId)
      },
      {
        $set: {
          ...value,
          updated_at: Date.now()
        }
      },
    )

    if (!modifiedCount) throw new Error()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.deleteDevice = async (req, res, next) => {
  try {
    const db = await connectDb()

    const { deletedCount } = await db.collection('devices').deleteOne({ _id: new ObjectId(req.params.deviceId) })

    if (!deletedCount) throw new ApiError(400, 'Không tìm thấy thiết bị')

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.getNumberToCall = async (req, res, next) => {
  try {
    const deviceId = req._id

    if (deviceId !== req.params.deviceId) {
      throw new ApiError(400, 'Device không khớp')
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
          network_id: device.network_id,
        },
      },
      {
        $sort: { call_time: 1 }
      },
      {
        $limit: 1
      }
    ]).toArray()

    if (!answerDevice) {
      throw new ApiError(404, 'Không tìm thấy thiết bị nghe rảnh')
    }

    const callDuration = Math.floor(randomInRange(config.duration.min, config.duration.max))
    const callDelay = Math.floor(randomInRange(config.delay.min, config.delay.max))

    if (!callDuration) throw new Error(400, `Duration không hợp lệ ${callDuration}`)

    const { modifiedCount } = await collection.updateMany(
      { _id: { $in: [new ObjectId(deviceId), answerDevice._id] }},
      {
        $set: {
          status: 'calling'
        }
      }
    )

    if (modifiedCount < 2) throw new Error(400)

    const { deletedCount } = await db.collection('logs').deleteMany({
      device_id: { $in: [deviceId, answerDevice._id.toString()] }
    })

    console.log('------')
    console.log('pre deleted logs', deletedCount)

    const logs = [
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
    ]

    const { insertedIds } = await db.collection('logs').insertMany(logs)

    console.log('inserted logs', logs)
    console.log('inserted log ids', insertedIds)
    console.log('------')
    res.status(200).send({ 
      phone_number: answerDevice.phone_number,
      duration: callDuration,
      delay: callDelay,
    })
  } catch (error) {
    next(error)
  }
}
