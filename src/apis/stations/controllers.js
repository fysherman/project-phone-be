const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getStationsSchema,
  createStationSchema,
  updateDeviceSchema,
} = require('../../models/stations')

exports.getStations = async (req, res, next) => {
  try {
    const { value, error } = getStationsSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('stations')
    const { page, limit } = value

    const [data, total] = await Promise.all([
      collection.find({}).sort({ _id: -1 }).skip(page === 1 ? 0 : (page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments({})
    ])

    res.status(200).send({
      total,
      page,
      limit,
      data
    })
  } catch (error) {
    next(error)
  }
}

exports.getStation = async (req, res, next) => {
  try {
    const db = await connectDb()

    const data = await db.collection('stations').findOne({ _id: new ObjectId(req.params.stationId) })

    res.status(200).send(data ?? {})
  } catch (error) {
    next(error)
  }
}

exports.createStation = async (req, res, next) => {
  try {
    const { value, error } = createStationSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('stations')
    const { name, code } = value

    const existStation = await collection.findOne({
      $or: [{ name }, { code }]
    })

    if (existStation) {
      throw new ApiError(400, `${existStation.name === name ? 'Tên' : 'Mã'} trạm đã tồn tại`)
    }

    await collection.insertOne({
      name,
      code,
      created_at: Date.now()
    })

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.updateStation = async (req, res, next) => {
  try {
    const { value, error } = updateDeviceSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('stations')
    const { name, code } = value

    const existStation = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.deviceId) },
      $or: [{ name }, { code }],
    })

    if (existStation) {
      throw new ApiError(400, `${existStation.name === name ? 'Tên' : 'Mã'} trạm đã tồn tại`)
    }

    await collection.updateOne(
      {
        _id: new ObjectId(req.params.deviceId)
      },
      {
        $set: {
          name,
          code,
          updated_at: Date.now()
        }
      }
    )

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}