const { ObjectId } = require('mongodb')
const connectDb = require('../database')

exports.wakeUp = async (req, res, next) => {
  try {
    const { _id, token_type } = req

    if (token_type === 'user') {
      next()
      return
    }
    
    const db = await connectDb()
    const { value } = await db.collection('devices').findOneAndUpdate(
      { _id: new ObjectId(_id), status: 'offline' },
      { $set: { status: 'running' } }
    )

    if (value) {
      const { deletedCount } = await db.collection('logs').deleteMany({ device_id: _id })
      console.log('Wake up device', _id, value?.name, value?.status, deletedCount)
    }

    next()
  } catch {
    next()
  }
}