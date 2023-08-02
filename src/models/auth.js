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

exports.refreshTokenSchema = Joi.object({
  user_id: Joi.string().required(),
  refresh_token: Joi.string().required()
})

exports.updateInfoSchema = Joi.object({
  username: Joi.string().max(255).required(),
})

exports.changePasswordSchema = Joi.object({
  password: Joi.string().min(6).max(255).required(),
  new_password: Joi.string().min(6).max(255).required()
})