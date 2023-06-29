const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { getDevicesSchema, createDeviceSchema, updateDeviceSchema } = require('../../models/call-devices')

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
    const collection = db.collection('devices')
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
    const collection = db.collection('devices')
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
        $set: value
      }
    )

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}