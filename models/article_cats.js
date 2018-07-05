var mongoose = require('mongoose');

var articleCatsSchema = mongoose.Schema({
	title:String,
	value:String,
	description:{type:String,default:''}
});

var ArticleCat = mongoose.model('ArticleCat', articleCatsSchema);
module.exports = ArticleCat;