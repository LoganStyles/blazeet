if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const PORT = process.env.PORT || 8000

var express = require('express'),
  session = require('express-session'),
  passport = require('passport'),
  app = express(),
  MongoStore = require('connect-mongo')(session),
  mongoStore = new MongoStore({
    url: 'mongodb://localhost/domiitStore',
    touchAfter: 24 * 3600
  }),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server);


var exphbs = require('express-handlebars');
var path = require('path');

//Set Static Path
app.use(express.static(path.join(__dirname, 'public')));
//View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('html', exphbs({
  //defaultLayout: 'main.html' //Default templating page
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    json: function (obj) {
      return JSON.stringify(obj);
    },
    counter: function (index) { //processes handlebars @index
      return index + 1;
    },
    ifEquals: function (arg1, arg2, options) {
      if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters")
      if (arg1 != arg2) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    },
    lastIndex: function (array) {
      return array.length - 1; //get last index of an array
    },
    myforloop: function (n, block) {
      var content = '';
      var date = new Date();
      var current_year = date.getFullYear();

      for (var i = n; i <= current_year; i++) {
        content += block.fn(i);
      }
      // console.log(content);
      return content;
    }
  }
}));
app.set('view engine', 'html');

var database = require('./routes/database'),
  connections = require('./models/activeConnections'),
credentials = require('./passportManager/credentials'), //update file after upload
notifications = require('./models/notifications'),
  user = require('./models/user');

var passMan = require('./passportManager')(passport, credentials, user),
  appMan = require('./applicationManager')(app, passport, session, mongoStore),
  sockMan = require('./socketioManager')(io, server, passport, mongoStore, connections),
  access = require('./routes/members')(express, app, passport, database),
  notifMan = require('./routes/notifs')(express, app, notifications, database),
  posts = require('./routes/posts')(express, app, passport, database),
  router = require('./routes')(app,io);
  

server.listen(PORT, function () {
  console.log('Server started on port ' + PORT);
});