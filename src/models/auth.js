const Joi = require('joi')

exports.registerSchema = Joi.object({
  username: Joi.string().max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(255).required()
})

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})