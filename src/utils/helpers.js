const bcrypt = require('bcrypt')
const dayjs = require('dayjs')
const { ObjectId } = require('mongodb')
const connectDb = require('../database')

exports.randomInRange = (min, max) => {
  return (Math.random() * (max - min)) + min
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