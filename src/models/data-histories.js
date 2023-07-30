const Joi = require('joi')

exports.getDataHistoriesSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow('').optional(),
  from: Joi.string().allow('').optional(),
  to: Joi.string().when('from', { is: Joi.valid(''), then: Joi.optional(), otherwise: Joi.required() }),
  device_id: Joi.string().allow('').optional()
})

exports.updateDataHistoriesSchema = Joi.object({
  status: Joi.string().valid('continue', 'finished', 'failed'),
  url: Joi.string().uri().when('status', { is: Joi.valid('continue'), then: Joi.optional(), otherwise: Joi.required() }),
  size: Joi.number().when('status', { is: Joi.valid('continue'), then: Joi.optional(), otherwise: Joi.required() }),
})