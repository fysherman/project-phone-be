const cron = require('node-cron')
const { ObjectId } = require('mongodb')
const connectDb = require('./database')

async function handleExpiredCallLogs(expiredLogs) {
  try {
    const db = await connectDb()

    await db.collection('logs').deleteMany({
      device_id: { $in: expiredLogs.map(({ device_id }) => device_id) }
    })

    const devicesCollection = await db.collection('devices')
    let updatedDevices = await Promise.all(expiredLogs.map(({ device_id }) => (
      devicesCollection.findOneAndUpdate(
        { status: 'calling', _id: new ObjectId(device_id) },
        { $set: { status: 'offline' } }
      )
    )))
    updatedDevices = updatedDevices.map(({ value }) => value).filter((item) => item)

    const phoneReportsCollection = await db.collection('phone-reports')
    await Promise.all([
      phoneReportsCollection.updateOne(
        {
          type: 'summary'
        },
        {
          $inc: { offline_devices: updatedDevices.length, calling_devices: updatedDevices.length * -1 }
        }
      ),
      ...Object.entries(
        updatedDevices.reduce((result, { station_id }) => {
          if (!station_id) return result

          result[station_id] = (result[station_id] || 0) + 1

          return result
        }, {})
      ).map(([ station_id, number ]) => (
        phoneReportsCollection.updateOne(
          { type: 'station', station_id },
          { $inc: { offline_devices: number, calling_devices: number * -1 } }
        )
      ))
    ])

    console.log('No response phone devices', updatedDevices.length)
  } catch (error) {
    console.log('-------Handle expired phone logs', error)
  }
}

async function handleExpiredDataLogs(expiredLogs) {
  try {
    const db = await connectDb()

    await db.collection('logs').deleteMany({
      device_id: { $in: expiredLogs.map(({ device_id }) => device_id) }
    })

    const devicesCollection = await db.collection('devices')
    let updatedDevices = await Promise.all(expiredLogs.map(({ device_id }) => (
      devicesCollection.findOneAndUpdate(
        { status: 'working', _id: new ObjectId(device_id) },
        { $set: { status: 'offline' } }
      )
    )))
    updatedDevices = updatedDevices.map(({ value }) => value).filter((item) => item)

    const dataReportsCollection = await db.collection('data-reports')
    await Promise.all([
      dataReportsCollection.updateOne(
        {
          type: 'summary'
        },
        {
          $inc: { offline_devices: updatedDevices.length, working_devices: updatedDevices.length * -1 }
        }
      ),
      ...Object.entries(
        updatedDevices.reduce((result, { station_id }) => {
          if (!station_id) return result

          result[station_id] = (result[station_id] || 0) + 1

          return result
        }, {})
      ).map(([ station_id, number ]) => (
        dataReportsCollection.updateOne(
          {
            type: 'station', station_id
          },
          {
            $inc: { offline_devices: number, working_devices: number * -1 }
          }
        )
      ))
    ])

    console.log('No response data devices', updatedDevices.length)
  } catch (error) {
    console.log('-------Handle expired data logs', error)
  }
}

cron.schedule('*/3 * * * *', async () => {
  try {
    console.log('----Cron job start---')
    
    const db = await connectDb()

    const [{ deletedCount }, expiredCallLogs, expiredDataLogs] = await Promise.all([
      db.collection('otps').deleteMany({
        created_at: { $lt: Date.now() - process.env.OTP_EXPIRE_TIME }
      }),
      db.collection('logs').find({
        type: { $in: ['answer', 'call'] },
        $expr: {
          $gt: [Date.now() - process.env.LOG_EXPIRE_TIME, { $add: ['$duration', '$created_at'] }]
        }
      }).toArray(),
      db.collection('logs').find({
        type: 'data',
        updated_at: { $lt: Date.now() - process.env.LOG_EXPIRE_TIME }
      }).toArray()
    ])

    console.log('Deleted opt: ', deletedCount)

    await Promise.all([
      handleExpiredCallLogs(expiredCallLogs),
      handleExpiredDataLogs(expiredDataLogs),
    ])
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