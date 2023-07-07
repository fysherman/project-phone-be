const Joi = require('joi')

exports.createOtpSchema = Joi.object({
  device_id: Joi.string().required()
})

exports.deactivateOtpSchema = Joi.object({
  device_id: Joi.string().required()
})

exports.activeDeviceSchema = Joi.object({
  otp: Joi.string().length(6).required()
})