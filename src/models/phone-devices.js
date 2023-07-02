const Joi = require('joi')

exports.getDevicesSchema = Joi.object({
  page: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
})

exports.createDeviceSchema = Joi.object({
  type: Joi.string().allow('call', 'answer').required(),
  name: Joi.string().min(1).max(255).required(),
  phone_number: Joi.string().max(255).required(),
  phone_report: Joi.string().max(255).required(),
  station_id: Joi.string().required(),
})

exports.updateDeviceSchema = Joi.object({
  type: Joi.string().min(1).allow('call', 'answer'),
  name: Joi.string().min(1).max(255),
  phone_number: Joi.string().max(255),
  phone_report: Joi.string().max(255),
  station_id: Joi.string(),
})

exports.activeDeviceSchema = Joi.object({
  otp: Joi.string().length(6).required()
})