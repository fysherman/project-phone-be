const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getLinksSchema,
  createLinkSchema,
  updateLinkSchema
} = require('../../models/data-links')

exports.getLinks = async (req, res, next) => {
  try {
    const { value, error } = getLinksSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('data-links')
    const { offset, limit, q, is_active } = value

    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      ...(q && { url: regex }),
      ...(typeof is_active === 'boolean' && { is_active })
    }

    const [data, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ created_at: -1 })
        .skip(offset === 1 ? 0 : (offset - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter)
    ])

    res.status(200).send({
      total,
      offset,
      limit,
      data
    })
  } catch (error) {
    next(error)
  }
}

exports.getLink = async (req, res, next) => {
  try {
    const db = await connectDb()

    const data = await db.collection('data-links').findOne({ _id: new ObjectId(req.params.linkId) })

    res.status(200).send(data ?? {})
  } catch (error) {
    next(error)
  }
}

exports.createLink = async (req, res, next) => {
  try {
    const { value, error } = createLinkSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('data-links')
    const { url } = value

    const existLink = await collection.findOne({
      url
    })

    if (existLink) {
      throw new ApiError(400, 'URL đã tồn tại')
    }

    await collection.insertOne({
      url,
      is_active: true,
      created_at: Date.now()
    })

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.updateLink = async (req, res, next) => {
  try {
    const { value, error } = updateLinkSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('data-links')
    const { url, is_active } = value

    const existLink = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.linkId) },
      url
    })

    if (existLink) {
      throw new ApiError(400, 'URL đã tồn tại')
    }

    const { modifiedCount } = await collection.updateOne(
      {
        _id: new ObjectId(req.params.linkId)
      },
      {
        $set: {
          url,
          is_active,
          updated_at: Date.now()
        }
      }
    )

    if (!modifiedCount) throw new ApiError()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.deleteLink = async (req, res, next) => {
  try {
    const db = await connectDb()

    const { deletedCount } = await db.collection('data-links').deleteOne({ _id: new ObjectId(req.params.linkId) })

    if (!deletedCount) throw new ApiError()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}