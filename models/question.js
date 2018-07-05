var mongoose = require('mongoose');

var questionSchema = mongoose.Schema({
	id:String,
	post_type:String,
	access:Number,
	body:String,
	shared_body:String,
	shared_description:String,
	category:String,
	sub_cat1:{type:String,default:''},
	sub_cat2:{type:String,default:''},
	description:{type:String,default:''},
	pics:[String],
	date_created: { type: Date, default: Date.now },
	date_modified: { type: Date, default: Date.now },
	post_date: { type: Date, default: Date.now },
	owner:{id:String,displayName:String,displayPic:String,status:String},
	post_owner:{type:Boolean,default:false},
	bookmarked_post:{type:Boolean,default:false},
	followed_post:{type:Boolean,default:false},
	liked_post:{type:Boolean,default:false},
	friend_status:{type:String,default:'not_friend'},//friend,not_friend,Pending
	
	question_status:{type:Boolean,default:true},
	art_status:{type:Boolean,default:false},
	riddle_status:{type:Boolean,default:false},
	pab_status:{type:Boolean,default:false},
	notice_status:{type:Boolean,default:false},
	trend_status:{type:Boolean,default:false},
	request_status:{type:Boolean,default:false},

	page_response:{type:String,default:'answer'},
	views:{type:Number,default:0},
	shares:{type:Number,default:0},
	likes:[String],
	answers_len:{type:Number,default:0},
	comments_len:{type:Number,default:0},
	comments:[{
		body:String,
		responderDisplayName:String,
		responder_id:String,
		responderDisplayPic:String,
		date_created:{type:Date,default:Date.now}
	}],
	answers:[{
		body:String,
		responderDisplayName:String,
		responder_id:String,
		responderDisplayPic:String,
		responderStatus:String,
		friend_status:String,//friend,not_friend,Pending
		pics:[String],
		date_created:{type:Date,default:Date.now},
		date_modified:{type:Date,default:Date.now},
		post_date: { type: Date, default: Date.now },
		views:{type:Number,default:0},
		upvotes:[String],
		downvotes:[String],
		comments:[{
			body:String,
			responderDisplayName:String,
			responder_id:String,
			responderDisplayPic:String,
			responderStatus:String,
			date_created:{type:Date,default:Date.now},
			likes:[String],
			reply:[{
				body:String,
				responderDisplayName:String,
				responder_id:String,
				responderDisplayPic:String,
				responderStatus:String,
				date_created:{type:Date,default:Date.now}
			}]
		}]

	}]

});

var Quest = mongoose.model('Quest', questionSchema);
module.exports = Quest;