var mongoose = require('mongoose');

var pabSchema = mongoose.Schema({
	id:String,
	post_type:String,
	access:Number,
	body:String,
	shared_body:String,
	shared_description:String,
	category:{type:String,default:''},
	author:{type:String,default:''},
	amount:{type:Number,default:0},
	isbn:{type:String,default:0},
	pages:{type:Number,default:0},
	publishers:{type:String,default:''},
	bookshop:{type:String,default:''},
	url:{type:String,default:''},
	synopsis:{type:String,default:''},
	about_author:{type:String,default:''},
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
	
	question_status:{type:Boolean,default:false},
	art_status:{type:Boolean,default:false},
	riddle_status:{type:Boolean,default:false},
	pab_status:{type:Boolean,default:true},
	notice_status:{type:Boolean,default:false},
	trend_status:{type:Boolean,default:false},
	request_status:{type:Boolean,default:false},

	page_response:{type:String,default:''},
	views:{type:Number,default:0},
	shares:{type:Number,default:0},
	likes:[String],
	comments_len:{type:Number,default:0},
	comments:[{
		body:String,
		responderDisplayName:String,
		responder_id:String,
		responderDisplayPic:String,
		date_created:{type:Date,default:Date.now}
	}]
});

var Pab = mongoose.model('Pab', pabSchema);
module.exports = Pab;