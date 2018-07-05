var database = require('../routes/database');
var notifications = require('../models/notifications');

var mongoose = require('mongoose');


var methods={};

//insert into notifications collection
methods.saveNotifs=function(notifiers, notif_type, section_id, section_name, section_resp_id, section_pic, url, msg, source_id, callback){
	var processed_items = 0;
	console.log('created notifs page')
	console.log(notifiers)
	notifiers.forEach((cur_item, index, array) => {
		let notif_user = new notifications();
		notif_user.notif_type = notif_type;
		notif_user.section_id = section_id;
		notif_user.section_name = section_name;
		notif_user.destination_url = url;
		notif_user.msg = msg;
		notif_user.source_id = source_id;
		notif_user.owner_id = cur_item;
		notif_user.section_pic = section_pic;

		notif_user.save(function (err, results) {
			if (err) console.log(err);

			if (results){
				console.log('notification saved')
				//update notifiers page if online

			} 

			processed_items++;
			if (processed_items == array.length) { //iteration has ended
				console.log('notifs save processing finished');
				//console.log(results);
				callback(results);
			}

		});

	});
};

module.exports=methods;