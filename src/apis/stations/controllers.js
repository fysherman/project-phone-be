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
            let: { id: { $convert: { input: '$assign_id', to: 'objectId', onError: '' } } },
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
        {
          $project: {
            _id: 1,
            name: 1,
            code: 1,
            type: 1,
            assign_id: 1,
            created_at: 1,
            assign_user: { $first: '$assign_user' }
          }
        },
        {
          $sort: { created_at: -1 }
        },
        {
          $skip: offset === 1 ? 0 : (offset - 1) * limit
        },
        {
          $limit: limit
        }
      ]).toArray(),
      collection.countDocuments({})
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

exports.getStation = async (req, res, next) => {
  try {
    const db = await connectDb()

    const [data] = await db.collection('stations').aggregate([
      {
        $match: {
          _id: new ObjectId(req.params.stationId)
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { id: { $convert: { input: '$assign_id', to: 'objectId', onError: '' } } },
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
      {
        $project: {
          _id: 1,
          name: 1,
          code: 1,
          type: 1,
          assign_id: 1,
          created_at: 1,
          assign_user: { $first: '$assign_user' }
        }
      },
    ]).toArray()

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

    const id = new ObjectId()

    await Promise.all([
      collection.insertOne({
        _id: id,
        type,
        name,
        code,
        assign_id,
        created_at: Date.now()
      }),
      db.collection('phone-reports').insertOne({
        type: 'station',
        station_id: id.toString()
      })
    ])

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

    const [{ deletedCount }] = await Promise.all([
      db.collection('stations').deleteOne({ _id: new ObjectId(req.params.stationId) }),
      db.collection('phone-reports').deleteOne({ station_id: req.params.stationId }),
    ])

    if (!deletedCount) throw new ApiError()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}