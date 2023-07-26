const dayjs = require('dayjs')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
const {
  getActivityStatisticsSchema
} = require('../../models/statistics')

exports.getStatistics = async (req, res, next) => {
  try {
    const { role, _id } = req

    const db = await connectDb()
    const devicesCollection = await db.collection('devices')

    let assignStationIds = []
    if (role === 'user') {
      await db.collection('stations')
        .find({ assign_id: _id })
        .forEach((doc) => {
          assignStationIds.push(doc._id.toString())
        })
    }

    const [
      totalDevice,
      totalCallingDevice,
      totalWorkingDevice,
      totalOfflineDevice,
      totalNotActiveDevice,
      totalCallDevice,
      totalCallingCallDevice,
      totalOfflineCallDevice,
      totalAnswerDevice,
      totalCallingAnswerDevice,
      totalOfflineAnswerDevice,
      totalDataDevice,
      totalWorkingDataDevice,
      totalOfflineDataDevice,
    ] = await Promise.all([
      devicesCollection.countDocuments({
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        status: 'calling',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        status: 'working',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        status: 'offline',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        is_active: false,
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'call',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'call',
        status: 'calling',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'call',
        status: 'offline',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'answer',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'answer',
        status: 'calling',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'answer',
        status: 'offline',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'data',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'data',
        status: 'working',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'data',
        status: 'offline',
        ...(role === 'user' && { station_id: { $in: assignStationIds } })
      }),
    ])

    res.status(200).send({
      device: {
        total: totalDevice,
        offline: totalOfflineDevice,
        calling: totalCallingDevice,
        working: totalWorkingDevice,
        not_active: totalNotActiveDevice,
        call: {
          total: totalCallDevice,
          offline: totalOfflineCallDevice,
          calling: totalCallingCallDevice,
        },
        answer: {
          total: totalAnswerDevice,
          offline: totalOfflineAnswerDevice,
          calling: totalCallingAnswerDevice,
        },
        data: {
          total: totalDataDevice,
          offline: totalOfflineDataDevice,
          working: totalWorkingDataDevice,
        },
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.getActivityStatistics = async (req, res, next) => {
  try {
    const { role, _id } = req
    const { value, error } = getActivityStatisticsSchema.validate(req.query)

    if (error) throw new ApiError(400, error.message)

    const {
      offset,
      limit,
      from,
      to,
      type
    } = value
    const db = await connectDb()

    let assignStationIds = []
    if (role === 'user') {
      await db.collection('stations')
        .find({ assign_id: _id })
        .forEach((doc) => {
          assignStationIds.push(doc._id.toString())
        })
    }

    const collection = await db.collection(type === 'phone' ? 'call-reports' : 'download-reports')

    const filter = {
      ...(from && to && { 
        created_at: {
          $gte: dayjs(from).startOf('day').valueOf(),
          $lte: dayjs(to).endOf('day').valueOf()
        }
      })
    }

    let [data, total, networks, stations] = await Promise.all([
      collection
        .find(filter)
        .sort({ created_at: -1 })
        .skip(offset === 1 ? 0 : (offset - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
      db.collection('networks').find().toArray(),
      db.collection('stations').find().toArray()
    ])

    data = data.map((item) => {
      let stationIds = Object.keys(item.by_stations || {})
      const networkIds = Object.keys(item.by_networks || {})
      const dataKeys = Object.keys(item.by_stations[stationIds[0]] || {})
      const totalData = {}

      if (!dataKeys.length) return item

      if (role === 'user') {
        stationIds = stationIds.filter((id) => assignStationIds.includes(id))

        if (!stationIds.length) return item
      }

      stationIds.forEach((id) => {
        const name = stations?.find((station) => station._id.toString() === id)?.name || ''

        item.by_stations[id].name = name

        dataKeys.forEach((key) => {
          totalData[key] = totalData[key] ? totalData[key] + item.by_stations[id][key] : item.by_stations[id][key]
        })
      })

      networkIds.forEach((id) => {
        const name = networks?.find((network) => network._id.toString() === id)?.name || ''

        item.by_networks[id].name = name
      })

      item = {...totalData, ...item}

      if (role === 'user') {
        delete item.by_networks
      }

      return item
    })

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