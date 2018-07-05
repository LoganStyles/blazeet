module.exports = function (app, passport, session, sessionStore) {
  var bodyParser = require('body-parser');

  // middleware
  app.use(bodyParser.urlencoded())
  app.use(session({
    key: 'connect.sid',
    secret: 'f249877c543a7a3021bc60a2&&%%4#)(!&!b45b162e()736',
    store: sessionStore,
    resave: false,
    saveUninitialized: true
  }))
  app.use(passport.initialize())
  app.use(passport.session())

  app.use(function (request, response, next) {
    // console.log('DOING ACCESS CONTROL STUFF')
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept,X-My-App-Token');
    response.header('Access-Control-Allow-Methods', 'DELETE, GET, POST, PUT');
    next();
  });



}