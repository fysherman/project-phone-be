const Joi = require('joi')

exports.getDevicesSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow(''),
  station_id: Joi.string().allow('').optional(),
  status: Joi.string().valid('', 'working', 'running', 'offline').optional(),
  is_active: Joi.boolean().allow('').optional(),
})

exports.createDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  station_id: Joi.string().required()
})

exports.updateDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  station_id: Joi.string().optional(),
  location: Joi.object({
    longitude: Joi.number().optional(),
    latitude: Joi.number().optional(),
  }).optional()
})

exports.startDownloadSchema = Joi.object({
  url: Joi.string().uri().required(),
})
