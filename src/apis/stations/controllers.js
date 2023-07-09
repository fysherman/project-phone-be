const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getStationsSchema,
  createStationSchema,
  updateStationSchema,
} = require('../../models/stations')

exports.getStations = async (req, res, next) => {
  try {
    const { value, error } = getStationsSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('stations')
    const { offset, limit, q, type } = value
    const regex = new RegExp(`${q}`, 'ig')

    // let [data, total] = await Promise.all([
    //   collection
    //     .find({
    //       ...(q && { $or: [{ name: regex }, { code: regex }] }),
    //       ...(type && { type })
    //     })
    //     .sort({ _id: -1 })
    //     .skip(offset === 1 ? 0 : (offset - 1) * limit)
    //     .limit(limit)
    //     .toArray(),
    //   collection.countDocuments({})
    // ])

    // const assignIds = data
    //   .map(({ assign_id }) => assign_id)
    //   .filter((id, ind, arr) => id && arr.indexOf(id) === ind)
    //   .map((id) => new ObjectId(id))
    // const users = await db.collection('users').find({ _id: { $in: assignIds } }).toArray()

    // data = data.map((station) => {
    //   if (!station?.assign_id) return station
      
    //   const { username, _id, email } = users.find(({ _id }) => _id.toString() === station.assign_id) || {}

    //   station.assign_user = { _id, username, email }

    //   return station
    // })

    let [data, total] = await Promise.all([
      collection.aggregate([
        {
          $match: {
            ...(q && { $or: [{ name: regex }, { code: regex }] }),
            ...(type && { type })
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { id: { $toObjectId: '$assign_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      '$_id',
                      '$$id'
                    ]
                  }
                }
              },
              { $project: { _id: 1, username: 1, email: 1 } }
            ],
            as: 'assign_user',
          }
        },
        { $unwind: '$assign_user' },
        {
          $sort: { created_at: -1 }
        },
        {
          $skip: offset === 1 ? 0 : (offset - 1) * limit
        }
      ]).toArray(),
      collection.countDocuments({})
    ])

    console.log(data)

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

exports.getStation = async (req, res, next) => {
  try {
    const db = await connectDb()

    const data = await db.collection('stations').findOne({ _id: new ObjectId(req.params.stationId) })
    
    if (data?.assign_id) {
      const user = await db.collection('users').findOne({ _id: new ObjectId(data.assign_id) })

      if (user) {
        const { username, _id, email } = user
        data.assign_user = { username, _id, email }
      }
    }

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
    const { name, code, type, assign_id = '' } = value

    const existData = await collection.findOne({
      $or: [{ name }, { code }]
    })

    if (existData) {
      let error = 'Tên trạm đã tồn tại'

      if (existData.code) error = 'Mã trạm đã tồn tại'

      throw new ApiError(400, error)
    }

    await collection.insertOne({
      type,
      name,
      code,
      assign_id,
      created_at: Date.now()
    })

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}

exports.updateStation = async (req, res, next) => {
  try {
    const { value, error } = updateStationSchema.validate(req.body)

    if (error) throw new ApiError(400, error.message)
    
    const db = await connectDb()
    const collection = await db.collection('stations')
    const { name, code } = value

    const existData = await collection.findOne({
      _id: { $ne: new ObjectId(req.params.stationId) },
      $or: [{ name }, { code }],
    })

    if (existData) {
      let error = 'Tên trạm đã tồn tại'

      if (existData.code) error = 'Mã trạm đã tồn tại'

      throw new ApiError(400, error)
    }

    const { modifiedCount } = await collection.updateOne(
      {
        _id: new ObjectId(req.params.stationId)
      },
      {
        $set: {
          ...value,
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

exports.deleteStation = async (req, res, next) => {
  try {
    const db = await connectDb()

    const { deletedCount } = await db.collection('stations').deleteOne({ _id: new ObjectId(req.params.stationId) })

    if (!deletedCount) throw new ApiError()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}