const Joi = require('joi')

exports.getStationsSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow(''),
  type: Joi.string().valid('phone', 'data', '').optional(),
  assign_id: Joi.string().allow('').optional(),
})

exports.createStationSchema = Joi.object({
  type: Joi.string().valid('phone', 'data').required(),
  code: Joi.string().min(1).max(255).required(),
  name: Joi.string().min(1).max(255).required(),
  assign_id: Joi.string().allow(''),
})

exports.updateStationSchema = Joi.object({
  code: Joi.string().min(1).max(255),
  name: Joi.string().min(1).max(255),
  assign_id: Joi.string().allow('')
})