const cron = require('node-cron')
const { ObjectId } = require('mongodb')
const connectDb = require('./database')

cron.schedule('*/3 * * * *', async () => {
  try {
    console.log('----Cron job start---')
    
    const db = await connectDb()

    const [{ deletedCount }, expiredLogs] = await Promise.all([
      db.collection('otps').deleteMany({
        created_at: { $lt: Date.now() - process.env.OTP_EXPIRE_TIME }
      }),
      db.collection('logs').find({
        $expr: {
          $gt: [Date.now() - process.env.LOG_EXPIRE_TIME, { $add: ['$duration', '$created_at'] }]
        }
      }).toArray()
    ])

    console.log('Deleted opt: ', deletedCount)
    const devicesCollection = await db.collection('devices')
    let updatedDevices = await Promise.all(expiredLogs.map(({ device_id }) => {
      devicesCollection.findOneAndUpdate(
        { status: 'calling', _id: new ObjectId(device_id) },
        { $set: { status: 'offline' } }
      )
    }))
    updatedDevices = updatedDevices.map(({ value }) => value).filter((item) => item)

    const phoneReportsCollection = await db.collection('phone-reports')
    await Promise.all([
      phoneReportsCollection.updateOne(
        {
          type: 'summary'
        },
        {
          $inc: { offline_devices: updatedDevices.length * -1 }
        }
      ),
      ...Object.entries(
        updatedDevices.reduce((result, { station_id }) => {
          if (!station_id) return result

          result[station_id] = (result[station_id] || 0) + 1

          return result
        }, {})
      ).map(([ station_id, number ]) => (
        phoneReportsCollection.updateOne({ type: 'station', station_id }, { $inc: { offline_devices: number * -1 } })
      ))
    ])

    console.log('No response devices', updatedDevices.length)
  } catch (error) {
    console.log('Cron error', error)
  }
})

cron.schedule('0 0 * * *', async () => {
  console.log('---Cron job start---', new Date())
  
  const db = await connectDb()
  const { modifiedCount } = await db.collection('devices').updateMany(
    { call_time: { $gt: 0 } },
    { $set: { call_time: 0 } }
  )

  console.log('Modified: ', modifiedCount)
}, {
  timezone: 'Asia/Ho_Chi_Minh'
})