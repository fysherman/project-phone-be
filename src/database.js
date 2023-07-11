const { MongoClient } = require('mongodb')
let cachedDb

async function setupDb() {
  try {
    const [callConfigs, phoneReports] = await Promise.allSettled([
      cachedDb.collection('configs').findOne({ type: 'call-config' }),
      cachedDb.collection('phone-reports').findOne()
    ])

    if (!callConfigs.value) {
      await cachedDb.collection('configs').insertOne({
        type: 'call-config',
        duration: { min: 10, max: 100 },
        delay: { min: 10, max: 100 }
      })
    }
    if (!phoneReports.value) {
      await cachedDb.collection('phone-reports').insertOne({})
    }
  } catch (error) {
    console.log(error)
  }
}

async function connectDb() {
  if (cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(process.env.DB_URI)
  await client.connect()

  cachedDb = client.db(process.env.DB_NAME)

  setupDb()

  return cachedDb
}

module.exports = connectDb