const ApiError = require('../utils/error')

exports.handleNotFound = function(req, res, next) {
  res.status(404).send('Không tìm thấy')
}

exports.handleError = function(err, req, res, next) {
  const { status = 500, message = 'Lỗi hệ thống', stack } = err || {}

  res.status(status).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack })
  })
}
