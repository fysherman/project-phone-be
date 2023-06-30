const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  updateCallConfigSchema,
} = require('../../models/configs')

exports.updateCallConfig = async (req, res, next) => {
  try {
    const { value, error } = updateCallConfigSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()

    await db.collection('configs').updateOne(
      {
        type: 'call-config'
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

exports.getCallConfig = async (req, res, next) => {
  try {
    const db = await connectDb()

    const data = await db.collection('configs').findOne({ type: 'call-config' })

    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
}