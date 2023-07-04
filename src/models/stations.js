const Joi = require('joi')

exports.getStationsSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
})

exports.createStationSchema = Joi.object({
  code: Joi.string().min(1).max(255).required(),
  name: Joi.string().min(1).max(255).required(),
})

exports.updateDeviceSchema = Joi.object({
  code: Joi.string().min(1).max(255),
  name: Joi.string().min(1).max(255),
})