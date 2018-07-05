var mongoose = require('mongoose');

var connectionSchema = mongoose.Schema({
	socketId:String,
    clientId:mongoose.Schema.Types.ObjectId,
    date_created: { type: Date, default: Date.now }
});

var activeConnections = mongoose.model('activeConnections', connectionSchema);
module.exports = activeConnections;