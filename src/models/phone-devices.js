const Joi = require('joi')

exports.getDevicesSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow(''),
  type: Joi.string().valid('call', 'answer', '').optional(),
  network_id: Joi.string().allow('').optional(),
  station_id: Joi.string().allow('').optional(),
  status: Joi.string().allow('').optional(),
  is_active: Joi.boolean().allow('').optional(),
})

exports.createDeviceSchema = Joi.object({
  type: Joi.string().valid('call', 'answer').required(),
  name: Joi.string().min(1).max(255).required(),
  phone_number: Joi.string().max(255).required(),
  phone_report: Joi.string().max(255).required(),
  station_id: Joi.string().required(),
  network_id: Joi.string().required(),
})

exports.updateDeviceSchema = Joi.object({
  type: Joi.string().min(1).valid('call', 'answer').optional(),
  name: Joi.string().min(1).max(255).optional(),
  phone_number: Joi.string().max(255).optional(),
  phone_report: Joi.string().max(255).optional(),
  station_id: Joi.string().optional(),
  network_id: Joi.string().optional(),
  location: Joi.object({
    longitude: Joi.number().optional(),
    latitude: Joi.number().optional(),
  }).optional()
})
