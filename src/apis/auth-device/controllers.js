const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { generateJwt, generateRandToken } = require('../../utils/token')
const {
  activeDeviceSchema,
  createOtpSchema,
  deactivateOtpSchema,
  refreshTokenSchema
} = require('../../models/auth-device')

exports.createOtp = async (req, res, next) => {
  try {
    const { value, error } = createOtpSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()

    const device = await db.collection('devices').findOne({
      _id: new ObjectId(value.device_id)
    })

    if (!device) {
      throw new ApiError(404, 'Không tìm thấy thiết bị')
    }

    const otp = (Math.random() * 1_000_000).toFixed()

    await db.collection('otps').insertOne({
      otp,
      device_id: value.device_id,
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

    const { value: otpData } = await db.collection('otps').findOneAndDelete({
      otp: value.otp,
      created_at: { $gt: Date.now() - process.env.OTP_EXPIRE_TIME }
    })

    if (!otpData) {
      throw new ApiError(404, 'OTP không khớp hoặc hết hạn')
    }

    const { device_id } = otpData
    const accessToken = await generateJwt({ _id: device_id, token_type: 'device' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    const { modifiedCount } = await db.collection('devices').updateOne(
      { _id: new ObjectId(device_id) },
      {
        $set: {
          is_active: true,
          status: 'running',
          refresh_token: refreshToken
        }
      }
    )

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy thiết bị')
    }

    await db.collection('phone-reports').updateOne(
      {},
      {
        $inc: {
          offline_devices: -1
        }
      }
    )

    res.status(200).send({ refresh_token: refreshToken, access_token: accessToken })
  } catch (error) {
    next(error)
  }
}

exports.deactivateDevice = async (req, res, next) => {
  try {
    const { value, error } = deactivateOtpSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const { modifiedCount } = await db.collection('devices').updateOne(
      { _id: new ObjectId(value.device_id) },
      {
        $set: {
          is_active: false,
          status: 'offline',
          refresh_token: ''
        }
      }
    )

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy thiết bị')
    }

    await db.collection('phone-reports').updateOne(
      {},
      {
        $inc: {
          offline_devices: 1
        }
      }
    )

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.refreshToken = async (req, res, next) => {
  try {
    const { value, error } = refreshTokenSchema.validate(req.body)

    if (error) {
      throw new ApiError(400, error.message)
    }

    const { device_id, refresh_token } = value
    const db = await connectDb()
    const collecton = await db.collection('devices')

    const accessToken = await generateJwt({ _id: device_id, token_type: 'device' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    const { modifiedCount } = await collecton.updateOne(
      { _id: new ObjectId(device_id), refresh_token },
      {
        $set: {
          refresh_token,
        }
      }
    )

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy thiết bị')
    }

    res.status(200).send({ access_token: accessToken, refresh_token: refreshToken })
  } catch (error) {
    next(error)
  }
}