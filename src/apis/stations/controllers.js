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
    const { role, _id } = req
    const { value, error } = getStationsSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const db = await connectDb()
    const collection = await db.collection('stations')
    const { offset, limit, q, type, assign_id } = value
    const regex = new RegExp(`${q}`, 'ig')
    const filter = {
      ...(q && { $or: [{ name: regex }, { code: regex }] }),
      ...(type && { type }),
      ...(assign_id && { assign_id }),
      ...(role === 'user' && { assign_id: _id })
    }

    let [data, total] = await Promise.all([
      collection.aggregate([
        {
          $match: filter
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

exports.getStation = async (req, res, next) => {
  try {
    const { params, role, _id } = req
    const db = await connectDb()

    const [data] = await db.collection('stations').aggregate([
      {
        $match: {
          _id: new ObjectId(params.stationId),
          ...(role === 'user' && { assign_id: _id }),
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

    await collection.insertOne({
      _id: id,
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

    const assignedDevice = await db.collection('devices').findOne({ station_id: req.params.stationId })

    if (assignedDevice) {
      throw new ApiError(400, 'Không thể xóa do có thiết bị đang gán vào trạm này này')
    }

    const { deletedCount } = await db.collection('stations').deleteOne({ _id: new ObjectId(req.params.stationId) })

    if (!deletedCount) throw new ApiError()

    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
}