const Joi = require('joi')

exports.getPhoneHistoriesSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
})

exports.createPhoneHistoriesSchema = Joi.object({
  type: Joi.string().valid('call', 'answer').required(),
  number_call: Joi.string().required(),
  number_answer: Joi.string().required(),
  duration: Joi.number().required(),
})