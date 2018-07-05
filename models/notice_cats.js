var mongoose = require('mongoose');

var noticeCatsSchema = mongoose.Schema({
	title:String,
	value:String,
	description:{type:String,default:''}
});

var NoticeCat = mongoose.model('NoticeCat', noticeCatsSchema);
module.exports = NoticeCat;