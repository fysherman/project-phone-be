const Joi = require('joi')

exports.getPhoneHistoriesSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  type: Joi.string().valid('call', 'answer', '').optional(),
  call_number: Joi.string().allow('').optional(),
  answer_number: Joi.string().allow('').optional(),
})

exports.createPhoneHistoriesSchema = Joi.object({
  type: Joi.string().valid('call', 'answer').required(),
  call_number: Joi.string().required(),
  answer_number: Joi.string().required(),
  duration: Joi.number().required(),
})