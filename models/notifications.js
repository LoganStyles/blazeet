var mongoose = require('mongoose');

var notificationsSchema = mongoose.Schema({
	notif_type:String,
	section_id:String,
	section_name:{type:String,default:''},
	destination_url:{type:String,default:''},
	msg:{type:String,default:''},
	source_id:{type:String,default:''},
	owner_id:{type:String,default:''},
	date_created: { type: Date, default: Date.now },
	status:{type:Boolean,default:false},
	section_pic:{type:String,default:''}
});

var Notification = mongoose.model('Notification', notificationsSchema);
module.exports = Notification;