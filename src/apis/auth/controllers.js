const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const { registerSchema, loginSchema, refreshTokenSchema } = require('../../models/auth')
const { generateJwt, generateRandToken } = require('../../utils/token')

exports.userLogin = async function(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body)

    if (error) {
      throw new ApiError(400, error.message)
    }

    const { email, password } = value
    const db = await connectDb()

    const user = await db.collection('users').findOne({ email })

    if (!user) throw new ApiError(401, 'Email không đúng')

    const isCorrectPassword = await bcrypt.compare(password, user.password)

    if (!isCorrectPassword) throw new ApiError(401, 'Mật khẩu không đúng')

    const accessToken = await generateJwt({ _id: user._id, token_type: 'user' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    await db.collection('users').updateOne(
      {
        _id: user._id
      },
      {
        $set: {
          refresh_token: refreshToken
        }
      }
    )
    res.status(200).send({ access_token: accessToken, refresh_token: refreshToken })
  } catch (error) {
    next(error)
  }
}

exports.userRegister = async function(req, res, next) {
  try {
    const { value, error } = registerSchema.validate(req.body)

    if (error) {
      throw new ApiError(400, error.message)
    }

    const { email, username, password } = value

    const db = await connectDb()

    const user = await db.collection('users').findOne({ email })

    if (user) {
      throw new ApiError(409, 'Email đã được dùng')
    }

    const userId = new ObjectId()
    const hashPassword = await bcrypt.hash(password, 10)
    const accessToken = await generateJwt({ _id: userId, token_type: 'user' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    await db.collection('users').insertOne({
      _id: userId,
      refresh_token: refreshToken,
      username,
      email,
      password: hashPassword,
      role: 'user',
      created_at: Date.now()
    })

    res.status(200).send({ access_token: accessToken, refresh_token: refreshToken })
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

    const { user_id, refresh_token } = value
    const db = await connectDb()
    const collecton = await db.collection('users')

    const accessToken = await generateJwt({ _id: user_id, token_type: 'user' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    const { modifiedCount } = await collecton.updateOne(
      { _id: new ObjectId(user_id), refresh_token },
      {
        $set: {
          refresh_token,
        }
      }
    )

    if (!modifiedCount) {
      throw new ApiError(400, 'Không tìm thấy user')
    }

    res.status(200).send({ access_token: accessToken, refresh_token: refreshToken })
  } catch (error) {
    next(error)
  }
}
