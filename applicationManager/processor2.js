var mongoose = require('mongoose');
var user = require('../models/user');
var group = require('../models/group');
var suggestion = require('../models/group_posts');
var article = require('../models/article');
var riddle = require('../models/riddle');
var question = require('../models/question');
var pab = require('../models/pab');
var notice = require('../models/notice');
var request_model = require('../models/request');
var trend = require('../models/trend');
var MongoClient = require('mongodb').MongoClient;
var mongo_url = process.env.MONGODB_URI;



var methods={};

/*get owner details*/
methods.getLatestOwnerDetails=function (arr){
    var promise=user.findOne({_id:arr.id},{
        displayName:1,
        displayPic:1,
        designation:1,
        trend_followed:1//string of ids
    }).exec();
    return promise;
};

/*get group details..copied*/
methods.getLatestGroupDetails=function (arr){
    var promise=group.findOne({_id:arr.id}).exec();
    return promise;
};

//save processed items
methods.saveProcessedItems=function(item,type){
    switch(type){
        case 'suggestion':
        section=suggestion;
        break;

        case 'question':
        section=question;
        break;

        case 'article':
        section=article;
        break;

        case 'request':
        section=request_model;
        break;

        case 'notice board':
        section=notice;
        break;

        case 'riddle':
        section=riddle;
        break;

        case 'Post Books':
        section=pab;
        break;

        case 'trending':
        case 'trend':
        section=trend;
        break;
    }

    //temp soln::suspect for issues
    //reset some post data to false for db in case it has been changed during processing
    item.post_owner=false;
    item.bookmarked_post=false;
    item.followed_post=false;
    item.liked_post=false;
    item.friend_status='not_friend';


    var promise=section.updateOne({_id:item._id},{$set:item}).exec();
    return promise;

};


/*get user details::similar to getLatestOwnerDetails, consider revising*/
methods.getUserDetails=function (item){
    var promise=user.findOne({_id:item}).exec();
    return promise;
};

methods.getStoryDetails=function (arr){
    var promise=trend.findOne({_id:arr._id}).exec();
    return promise;
};

/*handle notification for the current user*/
methods.getNotifications=function(user,callback){

//get pending friends length
var len=0;
console.log('getnotifs for '+user._id);


MongoClient.connect(mongo_url, function(err, db) {
  if (err) throw err;
//   var dbo = db.db("heroku_sdf7bh9m");
// console.log(mongo_url)
   var dbo = db.db("doomiit");
  dbo.collection("FriendshipCollection").find({$and:[{requested:user._id},{status:"Pending"}]}).toArray(function(err, result) {
    console.log('tracking')
    if (err) throw err;
    console.log(result);
    //console.log(result.length);
    
    len=result.length;
    db.close();
    callback(len);
  });

});

};

/*check if item is in an array of strings..copied*/
methods.isIncluded=function(collection,item_id,callback){
    var collection_len=collection.length;
    var curr_col;
    var status=false;

    for(var i=0;i<collection_len;i++){
        curr_col=collection[i];
        if(curr_col == (item_id).toString()){
            status=true;
        }
    }
    callback(status);
};

/*GET info for all items of a collection*/
methods.getItemDetails=function(collection,callback){
    var item_obj,item_results=[],curr_obj={};
    var promise,processed_items=0;

    collection.forEach((cur_item,index,array)=>{
    item_obj = mongoose.Types.ObjectId(cur_item);//convert id string to obj id
    promise = this.getUserDetails(item_obj);

    promise.then(function(response){

        curr_obj={
            item_id:response._id,
            item_displayName:response.displayName,
            item_displayPic:response.displayPic
        }
        item_results.push(curr_obj);

        processed_items++;
            if(processed_items==array.length){//iteration has ended
               // console.log('processing finished')
                callback(item_results);
            }


            }).catch(function(err3){
                //console.log('catch exec')
                console.log(err3)
            });    

        });
};

/*GET member & admin details*/
methods.getMemberAdminDetails=function(collection,callback){
    var item_obj,item_results=[],curr_obj={};
    var promise,processed_items=0;
    var member_arr=collection.member_ids;

    member_arr.forEach((cur_item,index,array)=>{
    item_obj = mongoose.Types.ObjectId(cur_item);//convert memberid string to obj id
    promise = this.getUserDetails(item_obj);

    promise.then(function(response){

        //chk if curr_usr isAdminUser
        methods.isIncluded(collection.admin_ids,cur_item,function(isAdminUser){

            curr_obj={
                item_id:response._id,
                item_displayName:response.displayName,
                item_displayPic:response.displayPic,
                item_isAdminUser:isAdminUser
            }
            item_results.push(curr_obj);

            processed_items++;
            if(processed_items==array.length){//iteration has ended
             callback(item_results);
         }

     });


    }).catch(function(err3){
        console.log(err3)
    });    

});
};


/*check if item has been previously bookmarked..replaced*/
methods.checkBookmarks=function(user,item_id){
    var saved_bookmarks_len=user.bookmarks.length;
    var saved_bookmarks=user.bookmarks;
    var curr_saved_bookmark;

    for(var i=0;i<saved_bookmarks_len;i++){
        curr_saved_bookmark=saved_bookmarks[i];
        if(curr_saved_bookmark.item_id == (item_id).toString()){
            return true;
        }
    }
    return false;
};

/*check if post owner is been followed by current user..replaced*/
methods.checkFollowed=function(user,owner_id){
    var followed_len=user.followed.length;
    var followed=user.followed;
    var curr_followed;

    for(var i=0;i<followed_len;i++){
        curr_followed=followed[i];
        if(curr_followed == (owner_id)){
            return true;
        }
    }
    return false;
};

/*check if item has been previously liked..replaced*/
methods.checkLikes=function(user_id,item_likes){
    var likes_len=item_likes.length;
    var curr_liked_id;

    for(var i=0;i<likes_len;i++){
        curr_liked_id=item_likes[i];
        if(curr_liked_id == (user_id).toString()){
            return true;
        }
    }
    return false;
};

methods.checkRelationship=function(user_id,post_owner_id,callback){
    /*check if there's pending friend request with post owner..copied
    or if post owner is already a friend*/
    //user_id::current user obj id
    //post_owner_id::post owner string id
    //console.log('inside relationship')
    var req_user_id=(user_id).toString();
    var post_owner_obj = mongoose.Types.ObjectId(post_owner_id);//convert id string to obj id

    if(req_user_id ===post_owner_id){
        //console.log('USER IS POST OWNER');
        callback('friend');
    }else{
        console.log('USER IS NOT POST OWNER..CHECKING FRIENDSHIP STATUS');
        user.getFriendship(user_id,post_owner_obj,function(err_res,rel_res){
            // console.log('inside getFriendship')
            if(err_res){
               console.log(err_res)

            }else if(rel_res){
                // console.log('results for relationship found');
                // console.log(rel_res._id);
                // console.log(rel_res.status);

            if(rel_res.status=='Accepted'){
                callback('friend');
            }else if(rel_res.status=='Pending'){
                callback('Pending');
            }
        }else{
            callback('not_friend');
        }

    });
    }
};

/*
perform some operations on the posts such as updating display pics,
checking if the post owner is a friend etc
.::chk type of post since some operations defer based on this
.
*/

methods.processPagePosts=function (items,ref_user,callback){
    //items::posts that are to be displayed
    //ref_user::current user viewing the posts
    //console.log('processPagePosts')
    //console.log(items);
    var promise,trend_followed=false,
    displayPic="",
    status="",
    display_name="",
    res_id="",
    processed_items=0;
    var row_count=0;

    items.forEach((cur_item,index,array)=>{
        var updated_obj={};
        if(cur_item.post_type=="trending"){
            promise = this.getStoryDetails(cur_item);//fetch data for this story
        }else{
            //check if post is already bookmarkd
            cur_item.bookmarked_post=this.checkBookmarks(ref_user,cur_item._id);
            //check if post is followed
            cur_item.followed_post=this.checkFollowed(ref_user,cur_item.owner.id);
            //check if post is already liked
            cur_item.liked_post=this.checkLikes(ref_user._id,cur_item.likes);

            //check relationship of current user with post owner
            this.checkRelationship(ref_user._id,cur_item.owner.id,function(rel_response){
                cur_item.friend_status=rel_response;
                console.log('finished CHECKING relationship')
               //console.log(items)
            });
            
            //loop thru all existing answers
            if(cur_item.answers && cur_item.answers.length >0){
                cur_item.answers.forEach((cur_answer,index,array)=>{
                    this.checkRelationship(ref_user._id,cur_answer.responder_id,function(rel_response){
                        cur_answer.friend_status=rel_response;
                    });
                });
            }

            //fetch data for this person
            promise = this.getLatestOwnerDetails(cur_item.owner);
        }

        promise.then(function(response){
            //for trends
            if(response && (cur_item.post_type=="trending")){
                //console.log('TRENDING CATEGORY ICON '+response.category_icon)
                displayPic=response.category_icon;
                // displayPic=(response.category_icon)?(response.category_icon):('images/trending.png');
                display_name=(response.category)?(response.category):('');
                res_id=(response._id)?((response._id).toString()):('');
                //check if the current user is following this trend
                //cur_item._id=trend id
                var user_trend_follows=ref_user.trend_follows //is array of followed trend ids by user
                for(var it=0,len=user_trend_follows.length;it <len;it++){
                    if(cur_item._id.indexOf(user_trend_follows[it]) !==-1){
                        trend_followed=true;
                        break;
                    }
                }
                cur_item.trend_followed=trend_followed;

            }else if(response){
                displayPic=(response.displayPic[0])?(response.displayPic[response.displayPic.length -1]):('uploads/avatar.png');
                status=(response.designation[0])?((response.designation[response.designation.length -1]).title):('');
                display_name=(response.displayName)?(response.displayName):('');
                res_id=(response._id)?((response._id).toString()):('');
                //console.log('res_id '+res_id);

                //check ownership of the secion post
                var req_user_id=(ref_user._id).toString();
                //console.log('req_user_id '+req_user_id);
                if(req_user_id ===res_id){
                    console.log('user is the owner of the post')
                    cur_item.post_owner=true;
                }
                
            }

            updated_obj={
                id:res_id,
                displayName:display_name,
                displayPic:displayPic,
                status:status
            };

            /* update owner info*/
            cur_item.owner=updated_obj;
            //update views
            cur_item.views++;

            //if group post, get group data     
            if(cur_item.post_type=="suggestion"){
                grouppromise = methods.getLatestGroupDetails(cur_item.group_data);
                grouppromise.then(function(grp_response){

                    if(grp_response){
                        displayPic=(grp_response.displayPic[0])?(grp_response.displayPic[grp_response.displayPic.length -1]):('uploads/avatar.png');
                        display_name=(grp_response.displayName)?(grp_response.displayName):('');
                        grp_id=(grp_response._id)?((grp_response._id).toString()):('');
                        member_count=grp_response.member_ids.length;
                        methods.isIncluded(grp_response.member_ids,ref_user._id,function(is_member){

                            cur_item.group_data={
                                id:grp_id,
                                displayName:display_name,
                                displayPic:displayPic,
                                member_len:member_count,
                                is_member:is_member
                            }

                        });
                        
                    }

                }).catch(function(grp_err){
                    console.log("Error occured while fetching group data");
                    console.log(grp_err)
                });

            }

            /*save or update item here*/
            
            //store some post data temporarily
            var temp_curr_owner=cur_item.post_owner;
            var temp_curr_friend_status=cur_item.friend_status;//store current post_owner value temporarily
            var temp_curr_bookmarked_post=cur_item.bookmarked_post;//store current post_owner value temporarily
            var temp_curr_followed_post=cur_item.followed_post;//store current post_owner value temporarily
            var temp_curr_liked_post=cur_item.liked_post;//store current post_owner value temporarily

            saveitem=methods.saveProcessedItems(cur_item,cur_item.post_type);
            saveitem.then(function(save_resp){
                //console.log(save_resp);
                cur_item.post_owner=temp_curr_owner;//reset ownership
                cur_item.bookmarked_post=temp_curr_bookmarked_post;//reset bookmarked_post
                cur_item.followed_post=temp_curr_followed_post;//reset followed_post
                cur_item.liked_post=temp_curr_liked_post;//reset liked_post
                cur_item.friend_status=temp_curr_friend_status;//reset friend_status

                processed_items++;
                if(processed_items==array.length){//iteration has ended
                    console.log('processing finished');
                    //console.log(items);
                    callback(items);
                }

            });

            }).catch(function(err3){
                console.log("Error occured while fetching owner/story data");
                console.log(err3)
            });

        });
};

module.exports=methods;