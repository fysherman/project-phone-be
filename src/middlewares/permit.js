exports.permit = (accessType, accessRole) => {
  return ({ token_type, role }, res, next) => {
    let hasPermit = true

    if (!accessType?.includes(token_type)) hasPermit = false
    if (token_type === 'user' && !accessRole?.includes(role)) hasPermit = false
    if (!hasPermit) {
      res
        .status(403)
        .send({
          error: 'Forbidden',
          message: 'Tài khoản không có quyền truy cập tài nguyên này'
        })
      return
    }
    next()
  }
}