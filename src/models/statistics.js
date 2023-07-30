const Joi = require('joi')

exports.getActivityStatisticsSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  type: Joi.string().valid('phone', 'data').required(),
  from: Joi.string().allow('').optional(),
  to: Joi.string().when('from', { is: Joi.valid(''), then: Joi.optional(), otherwise: Joi.required() }),
})
