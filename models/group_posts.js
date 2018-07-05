var mongoose = require('mongoose');

var groupPostsSchema = mongoose.Schema({	
	post_type:String,
	access:Number,
	body:String,
	shared_body:String,
	shared_description:String,
	description:{type:String,default:''},
	pics:{type:String,default:''},
	date_created: { type: Date, default: Date.now },
	date_modified: { type: Date, default: Date.now },
	post_date: { type: Date, default: Date.now },
	owner:{id:String,displayName:String,displayPic:String,status:String},
	group_data:{id:String,displayName:String,displayPic:String,member_len:Number,is_member:false},
	post_owner:{type:Boolean,default:false},
	bookmarked_post:{type:Boolean,default:false},
	followed_post:{type:Boolean,default:false},
	liked_post:{type:Boolean,default:false},
	friend_status:{type:String,default:'not_friend'},//friend,not_friend,Pending
	comments:[{
		body:String,
		responderDisplayName:String,
		responder_id:String,
		responderDisplayPic:String,
		date_created:{type:Date,default:Date.now}
	}],
	
	question_status:{type:Boolean,default:false},
	art_status:{type:Boolean,default:false},
	riddle_status:{type:Boolean,default:false},
	pab_status:{type:Boolean,default:false},
	notice_status:{type:Boolean,default:true},
	trend_status:{type:Boolean,default:false},
	group_post_status:{type:Boolean,default:true},

	page_response:{type:String,default:''},
	views:{type:Number,default:0},
	shares:{type:Number,default:0},
	likes:[String]

});

var GroupPost = mongoose.model('GroupPost', groupPostsSchema);
module.exports = GroupPost;