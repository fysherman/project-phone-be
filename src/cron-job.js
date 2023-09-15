const { Cron } = require('croner')
const { ObjectId } = require('mongodb')
const connectDb = require('./database')

async function handleExpiredCallLogs(expiredLogs) {
  try {
    const db = await connectDb()

    await db.collection('logs').deleteMany({
      device_id: { $in: expiredLogs.map(({ device_id }) => device_id) }
    })

    const { modifiedCount } = await db.collection('devices').updateMany(
      { status: 'calling', _id: { $in: expiredLogs.map(({ device_id }) => new ObjectId(device_id)) } },
      { $set: { status: 'offline' } }
    )

    console.log('------- No response phone devices', modifiedCount, expiredLogs)
    expiredLogs.forEach(log => {
      if (!log?.created_at) return
      console.log('log time', (new Date(log.created_at)).toString())
    })
  } catch (error) {
    console.log('------- Handle expired phone logs', error)
  }
}

async function handleExpiredDataLogs(expiredLogs) {
  try {
    const db = await connectDb()

    await db.collection('logs').deleteMany({
      device_id: { $in: expiredLogs.map(({ device_id }) => device_id) }
    })

    const { modifiedCount } = await db.collection('devices').updateMany(
      { status: 'working', _id: { $in: expiredLogs.map(({ device_id }) => new ObjectId(device_id)) } },
      { $set: { status: 'offline' } }
    )

    console.log('------- No response data devices', modifiedCount, expiredLogs)
  } catch (error) {
    console.log('------- Handle expired data logs', error)
  }
}

Cron('*/3 * * * *', async () => {
  try {
    console.log('-------')
    console.log('----Cron job start---', (new Date()).toString())
    console.log('-------')
    
    const db = await connectDb()

    const [, expiredCallLogs, expiredDataLogs] = await Promise.all([
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

    await Promise.all([
      handleExpiredCallLogs(expiredCallLogs),
      handleExpiredDataLogs(expiredDataLogs),
    ])
  } catch (error) {
    console.log('Cron error', error)
  }
})

Cron(
  '0 0 * * *',
  {
    timezone: 'Asia/Ho_Chi_Minh'
  },
  async () => {
    console.log('-------')
    console.log('---Cron job start---', new Date())
    console.log('-------')
    
    const db = await connectDb()
    const [{ modifiedCount: phoneDeviceUpdated }, { modifiedCount: dataDeviceUpdated }] = await Promise.all([
      db.collection('devices').updateMany(
        { type: { $in: ['call', 'answer'] }, call_time: { $gt: 0 } },
        { $set: { call_time: 0 } }
      ),
      db.collection('devices').updateMany(
        { type: 'data', size_downloaded: { $gt: 0 } },
        { $set: { size_downloaded: 0 } }
      )
    ])

    console.log('Modified phone: ', phoneDeviceUpdated)
    console.log('Modified data: ', dataDeviceUpdated)
  }
)