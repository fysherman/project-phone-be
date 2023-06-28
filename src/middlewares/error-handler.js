const ApiError = require('../utils/error')

exports.handleNotFound = function(req, res, next) {
  res.status(404).send('Not Found')
}

exports.handleError = function(err, req, res, next) {
  if (err instanceof ApiError) {
    const { status, message, stack } = err

    res.status(status).json({
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack })
    })
    return
  }

  console.log(err.message)
  console.log(err.stack)
  res.status(500).json('Internal Server Error')
}
