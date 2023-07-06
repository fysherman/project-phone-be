const Joi = require('joi')

exports.getNetworksSchema = Joi.object({
  offset: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  q: Joi.string().allow('').optional()
})

exports.createNetworkSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
})

exports.updateNetworkSchema = Joi.object({
  name: Joi.string().min(1).max(255),
})