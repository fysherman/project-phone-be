const Joi = require('joi')

exports.getLinksSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow('').optional()
})

exports.createLinkSchema = Joi.object({
  url: Joi.string().uri().required(),
})

exports.updateLinkSchema = Joi.object({
  url: Joi.string().uri().optional(),
  is_active: Joi.boolean().optional()
})