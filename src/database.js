const { MongoClient } = require('mongodb')
let cachedDb

async function setupDb() {
  try {
    const [callConfigs, dataConfigs] = await Promise.allSettled([
      cachedDb.collection('configs').findOne({ type: 'call-config' }),
      cachedDb.collection('configs').findOne({ type: 'data-config' }),
    ])

    if (!callConfigs.value) {
      await cachedDb.collection('configs').insertOne({
        type: 'call-config',
        duration: { min: 10, max: 100 },
        delay: { min: 10, max: 100 }
      })
    }
    if (!dataConfigs.value) {
      await cachedDb.collection('configs').insertOne({
        type: 'data-config',
        delay: { min: 10, max: 100 }
      })
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