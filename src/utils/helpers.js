const bcrypt = require('bcrypt')
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