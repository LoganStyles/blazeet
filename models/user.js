var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var options ={
    //Users model
    personModelName: 'User',
    //friendship model
    friendshipModelName: 'Friendship',
    //name of Friendship collection
    friendshipCollectionName: 'FriendshipCollection'
}

var friendsOfFriends = require('friends-of-friends')(mongoose,options);

var userSchema = mongoose.Schema({
    email:String,
    dob: { type: Date, default: '' },
    type:{type:String,default:'User'},
    level:{type:String,default:'beginner'},//beginner,expert
    password:String,
    firstname:{type:String,default:''},
    lastname:{type:String,default:''},
    country:{type:String,default:''},
    displayName:{type:String,default:'User'},
    displayPic:[{type:String,default:'uploads/avatar.png'}],
    backgroundPic:[{type:String,default:''}],
    phone:{type:String,default:''},
    date_created: { type: Date, default: Date.now },
    date_modified: { type: Date, default: Date.now },
    education:[{ title: String,body: String,from_year:String,to_year:String, date: { type: Date, default: Date.now } }],
    schools:[{ title: String,body: {type:String,default:''}, date: { type: Date, default: Date.now } }],
    designation:[{ title: String,body: String, date: Date }],
    qualification:[{ title: String,body: {type:String,default:''}, year:String,date: { type: Date, default: Date.now } }],
    description:{type:String,default:''},
    area_of_speciality:[String],
    group_ids:[String],
    gender:{type:String,default:'male'},
    location:{type:String,default:''},
    friends:[String],
    followers:[String],
    followed:[String],
    trend_follows:[String],
    bookmarks:[{item_id:String,body:String,date:{type:Date,default:Date.now}}],
    upvotes:[{item_id:String,section:String,section_id:String,date:{type:Date,default:Date.now}}],
    downvotes:[{item_id:String,section:String,section_id:String,date:{type:Date,default:Date.now}}],
    request_ids:[String],
    question_ids:[String],
    answer_ids:[String],
    article_ids:[String],
    review_ids:[String],
    riddle_ids:[String],
    solution_ids:[String],
    postedbook_ids:[String]
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(12), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

userSchema.plugin(friendsOfFriends.plugin,options);
var User = mongoose.model(options.personModelName, userSchema);
module.exports = User;