const Joi = require('joi')

exports.getNetworksSchema = Joi.object({
  page: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
})

exports.createNetworkSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
})

exports.updateNetworkSchema = Joi.object({
  name: Joi.string().min(1).max(255),
})