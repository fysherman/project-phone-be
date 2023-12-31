const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getNetworksSchema,
  createNetworkSchema,
  updateNetworkSchema
} = require('../../models/networks')

exports.getNetworks = async (req, res, next) => {
  try {
    const { value, error } = getNetworksSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('networks')
    const { offset, limit, q } = value

    const regex = new RegExp(`${q}`, 'ig')
    const filter = { ...(q && { name: regex }) }
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

exports.getNetwork = async (req, res, next) => {
  try {
    const db = await connectDb()

    const data = await db.collection('networks').findOne({ _id: new ObjectId(req.params.networkId) })

    res.status(200).send(data ?? {})
  } catch (error) {
    next(error)
  }
}

exports.createNetwork = async (req, res, next) => {
  try {
    const { value, error } = createNetworkSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('networks')
    const { name } = value

    const existNetwork = await collection.findOne({
      name
    })

    if (existNetwork) {
      throw new ApiError(400, 'Tên mạng đã tồn tại')
    }

    await collection.insertOne({
      name,
      created_at: Date.now()
    })

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.updateNetwork = async (req, res, next) => {
  try {
    const { value, error } = updateNetworkSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('networks')
    const { name } = value

    const existNetwork = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.networkId) },
      name
    })

    if (existNetwork) {
      throw new ApiError(400, 'Tên mạng đã tồn tại')
    }

    const { modifiedCount } = await collection.updateOne(
      {
        _id: new ObjectId(req.params.networkId)
      },
      {
        $set: {
          name,
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

exports.deleteNetwork = async (req, res, next) => {
  try {
    const db = await connectDb()

    const assignedDevice = await db.collection('devices').findOne({ network_id: req.params.networkId })

    if (assignedDevice) {
      throw new ApiError(400, 'Không thể xóa do có thiết bị đang gán vào mạng này')
    }

    const { deletedCount } = await db.collection('networks').deleteOne({ _id: new ObjectId(req.params.networkId) })

    if (!deletedCount) throw new ApiError(400, 'Không tìm thấy mạng')

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}