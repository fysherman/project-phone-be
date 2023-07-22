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

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    await db.collection('otps').insertOne({
      otp,
      device_id: value.device_id,
      type: device.type,
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
      type: value.type,
      created_at: { $gt: Date.now() - process.env.OTP_EXPIRE_TIME }
    })

    if (!otpData) {
      throw new ApiError(404, 'OTP không hợp lệ hoặc hết hạn')
    }

    const { device_id } = otpData
    const accessToken = await generateJwt({ _id: device_id, token_type: 'device' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    const { value: device } = await db.collection('devices').findOneAndUpdate(
      { _id: new ObjectId(device_id), is_active: false },
      {
        $set: {
          is_active: true,
          status: 'running',
          refresh_token: refreshToken
        }
      }
    )

    if (!device) {
      throw new ApiError(400, 'Không tìm thấy thiết bị')
    }

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
    const objectId = new ObjectId(value.device_id)

    const { value: device } = await db.collection('devices').findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          is_active: false,
          status: 'offline',
          refresh_token: ''
        }
      }
    )

    if (!device) {
      throw new ApiError(400, 'Không tìm thấy thiết bị')
    }

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
    const collection = await db.collection('devices')
    const accessToken = await generateJwt({ _id: device_id, token_type: 'device' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    const { modifiedCount } = await collection.updateOne(
      { _id: new ObjectId(device_id), refresh_token },
      {
        $set: {
          refresh_token: refreshToken,
        }
      }
    )

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy thiết bị hoặc token không hợp lệ')
    }

    res.status(200).send({ access_token: accessToken, refresh_token: refreshToken })
  } catch (error) {
    next(error)
  }
}

exports.getInfo = async (req, res, next) => {
  try {
    const db = await connectDb()
    const objectId = new ObjectId(req._id)

    let [data] = await db.collection('devices').aggregate([
      {
        $match: {
          _id: objectId
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
        $limit: 1
      }
    ]).toArray()

    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
}

exports.restartDevice = async (req, res, next) => {
  try {
    const db = await connectDb()
    const objectId = new ObjectId(req._id)

    const { value: device } = await db.collection('devices').findOneAndUpdate(
      { _id: objectId, status: 'offline', is_active: true },
      {
        $set: {
          status: 'running'
        }
      },
    )

    if (!device) {
      throw new ApiError(400, 'Không tìm thấy thiết bị offline')
    }

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}