module.exports = function (io, server, passport, sessionStore, connections) {
  var socketio = io.listen(server),
    domiitStore = require('passport.socketio')

  var authSuccess = function (data, accept) {
    console.log('success connect socket.io')
    accept()
  }

  var authFail = function (data, message, err, accept) {
    console.log('fail connect socket.io', message)
    if (err) accept(new Error(message))
  }

  socketio.use(domiitStore.authorize({
    cookieParser: require('cookie-parser'),
    key: 'connect.sid',
    secret: 'f249877c543a7a3021bc60a2&&%%4#)(!&!b45b162e()736',
    store: sessionStore,
    success: authSuccess,
    fail: authFail,
    passport: passport // see https://github.com/jfromaniello/passport.socketio/issues/61
  }))

  socketio.on('connection', function (socket) {
    // console.log('socket named %s connected', socket.nsp.name)
    //save active connections
    var client_id = socket.request.user._id;
    // console.log(typeof(client_id))
    // console.log(typeof(socket.id))
    connections.findOne({
      clientId: client_id
    }).exec(function (err, existingClient) {
      if (!existingClient) {
        var activeConnection = new connections({
          socketId: socket.id,
          clientId: client_id
        })
        activeConnection.save(function (err, data) {
          if (err) console.log(err);
          if (data) console.log(data);
        });
      } else {
        console.log('user already connected')
      }
    })

    // join
    // emit
    // set
    // on

    socketio.on('disconnect', function () { //remove user data from activeConnections when a socket disconnects
      connections.findOne({
        socketId: socket.id
      }).remove().exec();
      console.log('user disconnected & removed from activeconn')
    })
  })

  
}