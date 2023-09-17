let io

exports.initSocket = (instance) => {
  io = instance

  io.on('connection', (socket) => {
    const query = socket.handshake.query
    console.log('connect', socket.id)
    console.log(query)
    socket.on('disconnection', () => {
      console.log('disconnected', query)
    })
    socket.on('updateStatus', (data) => {
      console.log('result', data)
    })
    setInterval(() => {
      socket.emit('checkStatus', '1344324124')
    }, 5000)
  })
}

exports.io = io