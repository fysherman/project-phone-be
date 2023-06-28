const Joi = require('joi')

exports.getDevicesSchema = Joi.object({
  page: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
})

exports.createDeviceSchema = Joi.object({
  type: Joi.string().min(1).allow('call', 'answer').required(),
  name: Joi.string().min(1).required(),
  phone_number: Joi.string().required(),
  phone_report: Joi.string().required(),
  station_id: Joi.string().required(),
})

exports.updateDeviceSchema = Joi.object({
  type: Joi.string().min(1).allow('call', 'answer'),
  name: Joi.string().min(1),
  phone_number: Joi.string(),
  phone_report: Joi.string(),
  station_id: Joi.string(),
})