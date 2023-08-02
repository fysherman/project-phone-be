const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateInfoSchema,
  changePasswordSchema
} = require('../../models/auth')
const { generateJwt, generateRandToken } = require('../../utils/token')

exports.getUserInfo = async function(req, res, next) {
  try {
    const { _id, token_type } = req

    if (token_type !== 'user') throw new ApiError(400, 'Token không đúng')

    const db = await connectDb()

    const user = await db.collection('users').findOne({ _id: new ObjectId(_id) }, { projection: { refresh_token: 0, password: 0 } })

    if (!user) throw new ApiError(404, 'Không tìm thấy user')
    if (user.is_active === false) throw new ApiError(400, 'Tài khoản bị vô hiệu hóa')

    res.status(200).send(user)
  } catch (error) {
    next(error)
  }
}

exports.updateUserInfo = async function(req, res, next) {
  try {
    const { _id, token_type } = req

    if (token_type !== 'user') throw new ApiError(400, 'Token không đúng')

    const { value, error } = updateInfoSchema.validate(req.body)

    if (error) {
      throw new ApiError(400, error.message)
    }

    const db = await connectDb()

    const { modifiedCount } = await db.collection('users').updateOne({ _id: new ObjectId(_id) }, { $set: { username: value.username } })

    if (!modifiedCount) throw new ApiError(400, 'Không tìm thấy user')

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.changeUserPassword = async function(req, res, next) {
  try {
    const { _id, token_type } = req
    if (token_type !== 'user') throw new ApiError(400, 'Token không đúng')

    const { value, error } = changePasswordSchema.validate(req.body)
    if (error) {
      throw new ApiError(400, error.message)
    }

    const { password, new_password } = value
    const db = await connectDb()
    const collection = await db.collection('users')

    const user = await collection.findOne({ _id: new ObjectId(_id) })
    if (!user) throw new ApiError(404, 'Không tìm thấy user')

    const isCorrectPassword = await bcrypt.compare(password, user.password)
    if (!isCorrectPassword) throw new ApiError(400, 'Mật khẩu không đúng')

    const hashPassword = await bcrypt.hash(new_password, 10)

    const { modifiedCount } = await db.collection('users').updateOne({ _id: new ObjectId(_id) }, { $set: { password: hashPassword } })

    if (!modifiedCount) throw new ApiError(400, 'Không tìm thấy user')

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.userLogin = async function(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body)

    if (error) {
      throw new ApiError(400, error.message)
    }

    const { email, password } = value
    const db = await connectDb()

    const user = await db.collection('users').findOne({ email })

    if (!user) throw new ApiError(400, 'Email không đúng')

    const isCorrectPassword = await bcrypt.compare(password, user.password)

    if (!isCorrectPassword) throw new ApiError(400, 'Mật khẩu không đúng')
    if (user.is_active === false) throw new ApiError(400, 'Tài khoản bị vô hiệu hóa')

    const accessToken = await generateJwt({ _id: user._id, token_type: 'user', role: user.role }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
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
    const accessToken = await generateJwt({ _id: userId, token_type: 'user', role: 'user' }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })
    const refreshToken = generateRandToken()

    await db.collection('users').insertOne({
      _id: userId,
      refresh_token: refreshToken,
      username,
      email,
      password: hashPassword,
      role: 'user',
      is_active: true,
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
    const collection = await db.collection('users')

    const refreshToken = generateRandToken()

    const { value: user } = await collection.findOneAndUpdate(
      { _id: new ObjectId(user_id), refresh_token },
      {
        $set: {
          refresh_token,
        }
      }
    )

    if (!user) {
      throw new ApiError(400, 'Không tìm thấy user')
    }

    const accessToken = await generateJwt({ _id: user_id, token_type: 'user', role: user.role }, { expiresIn: process.env.TOKEN_EXPIRE_TIME })

    res.status(200).send({ access_token: accessToken, refresh_token: refreshToken })
  } catch (error) {
    next(error)
  }
}
