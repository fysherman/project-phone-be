const Joi = require('joi')

exports.getUsersSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow('').optional(),
  is_active: Joi.boolean().allow('').optional() 
})

exports.updateUserSchema = Joi.object({
  is_active: Joi.boolean().required() 
})