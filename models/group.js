var mongoose = require('mongoose');

var groupSchema = mongoose.Schema({   
    email:String,
    type:{type:String,default:'Group'},
    displayName:{type:String,default:'Group'},
    displayPic:[{type:String,default:'uploads/avatar.png'}],
    backgroundPic:[{type:String,default:''}],
    motto:{type:String,default:''},
    mission:{type:String,default:''},
    vision:{type:String,default:''},
    aboutus:{type:String,default:''},
    date_created: { type: Date, default: Date.now },
    date_modified: { type: Date, default: Date.now },
    activitys:{type:String,default:''},
    member_ids:[String],
    admin_ids:[String],
    superadmin_ids:[String],
    bookmarks:[{item_id:String,body:String,date:{type:Date,default:Date.now}}]
});

var Group = mongoose.model('Group', groupSchema);
module.exports = Group;