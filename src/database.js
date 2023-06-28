const { MongoClient } = require('mongodb')
let cachedDb

async function connectDb() {
  if (cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(process.env.DB_URI)
  await client.connect()

  cachedDb = client.db(process.env.DB_NAME)

  return cachedDb
}

module.exports = connectDb