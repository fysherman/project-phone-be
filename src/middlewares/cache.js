const connectRedis = require('../redis')

exports.serveCache = async function (key, res, next) {
  try {
    const redis = await connectRedis()

    const data = await redis.get(key)

    if (data) {
      console.log('Response from cache')
      res.status(200).send(JSON.parse(data))
      return
    }
    next()
  } catch (error) {
    console.log(error)
    next()
  }
}
