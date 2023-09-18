const { ObjectId } = require('mongodb')
const connectDb = require('./database')

let io

exports.initSocket = (instance) => {
  io = instance

  io.on('connection', (socket) => {
    console.log('connect', socket.id)
  })
  io.on('updateStatus', async (id) => {
    const db = await connectDb()
    console.log(`updateStatus ${id}`)
    if (id) {
      console.log(`updateStatus run ${id}`)

      const { modifiedCount } = await db.collection('devices').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { status: 'running' }
        }
      )
      await db.collection('logs').deleteMany({ device_id: id })
      console.log('modified', modifiedCount)
    }
  })
}

exports.getIo = () => io