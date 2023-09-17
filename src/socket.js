let io

exports.initSocket = (instance) => {
  io = instance

  io.on('connection', (socket) => {
    console.log('connect', socket.id)
  })
}

exports.io = io