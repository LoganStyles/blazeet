var mongoose = require('mongoose');

var trendSchema = mongoose.Schema({
	post_type:String,
	access:Number,
	body:String,
	shared_body:String,
	shared_description:String,
	excerpt:{type:String,default:''},
	brief:String,
	category:String,
	category_icon:{type:String,default:''},
	description:{type:String,default:''},
	pics:{type:String,default:''},
	date_created: { type: Date, default: Date.now },
	date_modified: { type: Date, default: Date.now },
	post_date: { type: Date, default: Date.now },
	owner:{id:String,displayName:String,displayPic:String,status:String},
	post_owner:{type:Boolean,default:false},
	bookmarked_post:{type:Boolean,default:false},
	followed_post:{type:Boolean,default:false},
	liked_post:{type:Boolean,default:false},
	friend_status:{type:String,default:'not_friend'},//friend,not_friend,Pending
	
	question_status:{type:Boolean,default:false},
	art_status:{type:Boolean,default:false},
	riddle_status:{type:Boolean,default:false},
	pab_status:{type:Boolean,default:false},
	notice_status:{type:Boolean,default:false},
	trend_status:{type:Boolean,default:true},
	request_status:{type:Boolean,default:false},

	page_response:{type:String,default:''},
	trend_followed:{type:Boolean,default:false},
	views:{type:Number,default:0},
	shares:{type:Number,default:0},
	likes:[String],
	//comments_len:{type:Number,default:0},
	comments:[{
		body:String,
		responderDisplayName:String,
		responder_id:String,
		responderDisplayPic:String,
		date_created:{type:Date,default:Date.now}
	}]	
});

var Trend = mongoose.model('Trend', trendSchema);
module.exports = Trend;