const redis = require('redis')
let cachedClient

async function connectRedis() {
  if (cachedClient) return cachedClient

  const client = redis.createClient()

  client.on('error', err => {
    cachedClient = null
    console.log('Redis Client Error', err)
  })
  client.on('end', () => {
    cachedClient = null
    console.log('Redis Client End')
  })

  await client.connect()

  cachedClient = client
  return client
}

module.exports = connectRedis