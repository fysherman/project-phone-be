const crypto = require('crypto')
const jwt = require('jsonwebtoken')

exports.generateJwt = function(data, options = {}) {
  return new Promise((res, rej) => {
    jwt.sign(data, process.env.TOKEN_SECRET, options, (err, token) => {
      if (err) return rej(err)
      res(token)
    })
  })
}

exports.verifyJwt = function(token, options = {}) {
  return new Promise((res, rej) => {
    jwt.verify(token, process.env.TOKEN_SECRET, options, (err, decoded) => {
      if (err) return rej(err)
      res(decoded)
    })
  })
}

exports.generateRandToken = function() {
  return crypto.randomBytes(64).toString('hex')
}