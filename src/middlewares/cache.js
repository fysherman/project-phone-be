const connectRedis = require('../redis')

exports.serveCache = async function (key) {
  return async (req, res, next) => {
    try {
      const redis = await connectRedis()

      const data = await redis.get(key)

      console.log(data)
      next()
    } catch (error) {
      console.log(error)
      next()
    }
  }
}
