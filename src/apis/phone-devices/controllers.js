const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { generateJwt, generateRandToken } = require('../../utils/token')
const {
  getDevicesSchema,
  createDeviceSchema, 
  updateDeviceSchema,
  activeDeviceSchema
} = require('../../models/phone-devices')

exports.getDevices = async (req, res, next) => {
  try {
    const { value, error } = getDevicesSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('devices')
    const { offset, limit } = value

    const [data, total] = await Promise.all([
      collection.find({}).sort({ _id: -1 }).skip(offset === 1 ? 0 : (offset - 1) * limit).limit(limit).toArray(),
      collection.countDocuments({})
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

    const targetDevice = await collection.updateOne(
      { is_active: true, status: 'running' },
      {
        $set: {
          status: 'calling'
        }
      }
    )

    console.log(targetDevice)
    if (!targetDevice) {
      throw new ApiError(404, 'Không tìm thấy thiết bị rảnh')
    }

    await collection.updateOne(
      { _id: new ObjectId(deviceId)},
      {
        $set: {
          status: 'calling'
        }
      }
    )

    res.status(200).send({ 
      phone_number: targetDevice.phone_number,
      duration: 500,
      delay: 1000,
    })
  } catch (error) {
    next(error)
  }
}

exports.createOtp = async (req, res, next) => {
  try {
    const db = await connectDb()

    const device = await db.collection('devices').findOne({
      _id: new ObjectId(req.params.deviceId)
    })

    if (!device) {
      throw new ApiError(404, 'Không tìm thấy thiết bị')
    }

    const otp = (Math.random() * 1_000_000).toFixed()

    await db.collection('otps').insertOne({
      otp,
      device_id: device._id,
      created_at: Date.now()
    })

    res.status(200).send({ otp })
  } catch (error) {
    next(error)
  }
}

exports.activeDevice = async (req, res, next) => {
  try {
    const { value, error } = activeDeviceSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()

    const { value: otpData } = await db.collection('otps').findOneAndDelete({ otp: value.otp })

    console.log(otpData)
    if (!otpData) {
      throw new ApiError(404, 'OTP không khớp hoặc hết hạn')
    }

    const { device_id, created_at } = otpData

    if (created_at + process.env.OTP_EXPIRE_TIME < Date.now()) {
      throw new ApiError(400, 'OTP hết hạn')
    }

    const accessToken = await generateJwt({ _id: device_id, token_type: 'device' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    const { modifiedCount } = await db.collection('devices').updateOne(
      { _id: new ObjectId(device_id) },
      {
        $set: {
          refresh_token: refreshToken
        }
      }
    )

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy thiết bị')
    }

    res.status(200).send({ refresh_token: refreshToken, access_token: accessToken })
  } catch (error) {
    next(error)
  }
}