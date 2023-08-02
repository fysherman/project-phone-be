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
      q,
      station_id,
      status,
      is_active
    } = value
    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      type: 'data',
      ...(q && { $or: [{ name: regex }, { phone_number: regex }] }),
      ...(typeof is_active === 'boolean' && { is_active }),
      ...(status && { status }),
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
            size_downloaded: 1,
            location: 1,
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
          size_downloaded: 1,
          location: 1,
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

    await collection.insertOne({
      ...value,
      type: 'data',
      is_active: false,
      status: 'offline',
      size_downloaded: 0,
      location: {},
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
    const { name, station_id } = value

    const existDevice = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.deviceId) },
      type: 'data',
      name
    })

    if (existDevice) {
      throw new ApiError(400, 'Tên đã tồn tại')
    }

    if (station_id) {
      const station = await db.collection('networks').findOne({ _id: new ObjectId(station_id) })

      if (!station) {
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

    if (!deletedCount) throw new ApiError()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.startDownload = async (req, res, next) => {
  try {
    const deviceId = req._id

    if (deviceId !== req.params.deviceId) {
      throw new ApiError(404, 'Device không khớp')
    }

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

    await db.collection('logs').insertOne({
      type: 'data',
      url: value.url,
      device_id: deviceId,
      created_at: Date.now(),
      updated_at: Date.now()
    })

    res.status(200).send({ 
      delay: downloadDelay,
    })
  } catch (error) {
    next(error)
  }
}
