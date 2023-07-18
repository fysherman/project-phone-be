const dayjs = require('dayjs')
const { ObjectId } = require('mongodb')
const connectDb = require('../../database')
const ApiError = require('../../utils/error')
// const {
// } = require('../../models/stations')

exports.getStatistics = async (req, res, next) => {
  try {
    const { role, _id } = req

    const db = await connectDb()
    const devicesCollection = await db.collection('devices')
    const callReportsCollection = await db.collection('call-reports')
    const downloadReportsCollection = await db.collection('download-reports')
    const startOfDay = dayjs().hour(0).minute(0).second(0).millisecond(0).valueOf()

    let assignStationIds
    if (role === 'user') {
      const assignStations = await db.collection('stations').find({ assign_id: _id })
      assignStationIds = assignStations.map((station) => station._id.toString())
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
      callReportsToday,
      downloadReportsToday,
    ] = await Promise.all([
      devicesCollection.countDocuments({
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        status: 'calling',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        status: 'working',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        status: 'offline',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        is_active: false,
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'call',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'call',
        status: 'calling',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'call',
        status: 'offline',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'answer',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'answer',
        status: 'calling',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'answer',
        status: 'offline',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'data',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'data',
        status: 'working',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      devicesCollection.countDocuments({
        type: 'data',
        status: 'offline',
        ...(assignStationIds && { station_id: { $in: assignStationIds } })
      }),
      callReportsCollection.findOne({
        created_at: startOfDay
      }),
      downloadReportsCollection.findOne({
        created_at: startOfDay
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
      },
      call: callReportsToday,
      download: downloadReportsToday
    })
  } catch (error) {
    next(error)
  }
}
