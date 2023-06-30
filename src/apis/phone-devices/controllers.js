const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { getDevicesSchema, createDeviceSchema, updateDeviceSchema } = require('../../models/phone-devices')

exports.getDevices = async (req, res, next) => {
  try {
    const { value, error } = getDevicesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('devices')
    const { page, limit } = value

    const [data, total] = await Promise.all([
      collection.find({}).sort({ _id: -1 }).skip(page === 1 ? 0 : (page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments({})
    ])

    res.status(200).send({
      total,
      page,
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

    const data = await db.collection('devices').findOne({ _id: new ObjectId(req.params.deviceId) })

    res.status(200).send(data ?? {})
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
    const { name, phone_number } = value

    const existDevice = await collection.findOne({
      $or: [{ name }, { phone_number }]
    })

    if (existDevice) {
      throw new ApiError(400, `${existDevice.name === name ? 'Tên' : 'Số điện thoại'} đã tồn tại`)
    }

    await collection.insertOne({
      ...value,
      is_active: false,
      status: 'offline',
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
    const { name, phone_number } = value

    const existDevice = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.deviceId) },
      $or: [{ name }, { phone_number }],
    })

    if (existDevice) {
      throw new ApiError(400, `${existDevice.name === name ? 'Tên' : 'Số điện thoại'} đã tồn tại`)
    }

    await collection.updateOne(
      {
        _id: new ObjectId(req.params.deviceId)
      },
      {
        $set: {
          ...value,
          updated_at: Date.now()
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
    const deviceId = req.device_id

    const db = await connectDb()
    const collection = await db.collection('devices')

    const device = await collection.findOne({ _id: new ObjectId(deviceId) })

    if (!device) {
      throw new ApiError(404, 'Không tìm thấy thiết bị')
    }
    if (!device.status !== 'running') {
      throw new ApiError(400, 'Thiết bị đang không ở trạng thái rảnh')
    }

    const targetDevice = await collection.findOne({ is_active: true, status: 'running' })

    if (!targetDevice) {
      throw new ApiError(404, 'Không tìm thấy thiết bị rảnh')
    }

    res.status(200).send({ 
      phone_number: targetDevice.phone_number,
      duration: 500,
      delay: 1000,
    })
  } catch (error) {
    next(error)
  }
}