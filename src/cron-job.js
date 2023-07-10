const cron = require('node-cron')
const connectDb = require('./database')

cron.schedule('*/3 * * * *', async () => {
  try {
    console.log('----Cron job start---')
    
    const db = await connectDb()

    const { deletedCount } = await db.collection('otps').deleteMany({
      created_at: { $lt: Date.now() - process.env.OTP_EXPIRE_TIME }
    })

    console.log('Deleted opt: ', deletedCount)
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