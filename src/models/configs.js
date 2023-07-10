const Joi = require('joi')

exports.updateCallConfigSchema = Joi.object({
  duration: Joi.object({
    min: Joi.number().integer().min(1).required(),
    max: Joi.number().integer().min(1).required(),
  }).optional(),
  delay: Joi.object({
    min: Joi.number().integer().min(1).required(),
    max: Joi.number().integer().min(1).required(),
  }).optional(),
})