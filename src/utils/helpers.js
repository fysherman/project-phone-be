const bcrypt = require('bcrypt')
const dayjs = require('dayjs')
const { ObjectId } = require('mongodb')
const connectDb = require('../database')

exports.randomInRange = (min, max) => {
  return (Math.random() * (max - min)) + min
}

exports.sortObjectKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return {}

  const entriesSort = Object.entries(obj).sort((entry1, entry2) => {
    return entry1[0].localeCompare(entry2[0], 'en', {
      sensitivity: 'case',
      numeric: true,
    })
  })
  return Object.fromEntries(entriesSort)
}

exports.objectToString = (obj) => {
  if (!obj || typeof obj !== 'object') return ''

  return Object.entries(obj).flat(1).join('_')
}

exports.testCommand = () => {
  console.log('command run')
}

exports.createAdmin = async (email, username, password) => {
  try {
    require('dotenv').config()

    const db = await connectDb()

    const user = await db.collection('users').findOne({ email })

    if (user) {
      console.log('Duplicate email')
      process.exit()
    }

    const hashPassword = await bcrypt.hash(password, 10)

    await db.collection('users').insertOne({
      _id: new ObjectId(),
      username,
      email,
      password: hashPassword,
      role: 'admin',
      created_at: Date.now()
    })
    console.log('success')
    process.exit()
  } catch (error) {
    console.log('error', error)
    process.exit()
  }
}

exports.createDummyDataReports = async (day) => {
  try {
    require('dotenv').config()

    const startOfDay = dayjs(day).startOf('day').valueOf()

    if (!startOfDay) throw new Error()

    const db = await connectDb()
    const report = await db.collection('download-reports').findOne({ created_at: startOfDay })
    const stationIds = []

    await db.collection('stations').find().forEach((doc) => {
      stationIds.push(doc._id.toString()) 
    })

    const payload = {}

    stationIds.forEach((id) => {
      payload[`by_stations.${id}.total`] = Math.ceil(Math.random() * 100)
      payload[`by_stations.${id}.size`] = Math.ceil(Math.random() * 100000)
    })

    if (
      !report
    ) {
      await db.collection('download-reports').insertOne({
        created_at: startOfDay
      })
    }
    await db.collection('download-reports').updateOne(
      {
        created_at: startOfDay
      },
      {
        $inc: payload
      }
    )

    console.log('done')
    process.exit()
  } catch (error) {
    console.log('error', error)
    process.exit()
  }
}

exports.createDummyPhoneReports = async (day) => {
  try {
    require('dotenv').config()

    const startOfDay = dayjs(day).startOf('day').valueOf()

    if (!startOfDay) throw new Error()

    const db = await connectDb()
    const report = await db.collection('call-reports').findOne({ created_at: startOfDay })
    const stationIds = []
    const networkIds = []

    await db.collection('stations').find().forEach((doc) => {
      stationIds.push(doc._id.toString()) 
    })
    await db.collection('networks').find().forEach((doc) => {
      networkIds.push(doc._id.toString()) 
    })

    const payload = {}

    stationIds.forEach((id) => {
      payload[`by_stations.${id}.total`] = Math.ceil(Math.random() * 100)
      payload[`by_stations.${id}.time`] = Math.ceil(Math.random() * 100000)
    })
    networkIds.forEach((id) => {
      payload[`by_networks.${id}.total`] = Math.ceil(Math.random() * 100)
      payload[`by_networks.${id}.time`] = Math.ceil(Math.random() * 100000)
    })

    if (
      !report
    ) {
      await db.collection('call-reports').insertOne({
        created_at: startOfDay
      })
    }
    await db.collection('call-reports').updateOne(
      {
        created_at: startOfDay
      },
      {
        $inc: payload
      }
    )

    console.log('done')
    process.exit()
  } catch (error) {
    console.log('error', error)
    process.exit()
  }
}

exports.createDummyCallHistories = async (quantity, day) => {
  try {
    require('dotenv').config()

    const createdAt = dayjs(day).valueOf()
    const db = await connectDb()

    const callDevice = await db.collection('devices').findOne({ type: 'call' })
    const answerDevice = await db.collection('devices').findOne({ type: 'answer' })
    const callId = callDevice._id.toString()
    const answerId = answerDevice._id.toString()
    const array = Array(quantity).fill(0)

    await db.collection('histories').insertMany([
      ...array.map(() => ({
        type: 'call',
        device_id: callId,
        call_number: callDevice.phone_number,
        answer_number: answerDevice.phone_number,
        duration: Math.ceil(Math.random() * 10000),
        created_at: createdAt
      })),
      ...array.map(() => ({
        type: 'answer',
        device_id: answerId,
        call_number: callDevice.phone_number,
        answer_number: answerDevice.phone_number,
        duration: Math.ceil(Math.random() * 10000),
        created_at: createdAt
      }))
    ])

    console.log('done')
    process.exit()
  } catch (error) {
    console.log('error', error)
    process.exit()
  }
}

exports.createDummyDownloadHistories = async (quantity, day) => {
  try {
    require('dotenv').config()

    const createdAt = dayjs(day).valueOf()
    const db = await connectDb()

    const device = await db.collection('devices').findOne({ type: 'data' })
    const deviceId = device._id.toString()
    const array = Array(quantity).fill(0)

    await db.collection('histories').insertMany(
      array.map(() => ({
        type: 'data',
        device_id: deviceId,
        status: ['finished', 'failed'][Math.floor(Math.random() * 2)],
        url: 'https://test.com',
        size: Math.ceil(Math.random() * 100000),
        created_at: createdAt
      }))
    )

    console.log('done')
    process.exit()
  } catch (error) {
    console.log('error', error)
    process.exit()
  }
}