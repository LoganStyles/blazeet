module.exports = function (express, app, notifications) {

    var mongoose = require('mongoose');
    var router = express.Router();
    var process_posts = require('../applicationManager/processor');

    //display a list of the current user's pending notifs
    router.get('/getUnviewedNotifications', isLoggedIn, function (req, res) {
        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Update your profile first"
            });
        } else {

            //find pending friends request length
            var pending_friend_notifs = 0;
            process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                pending_friend_notifs = rel_notifs;

            var id_string = (req.user._id).toString();
            var res_notifs = [],
                page = 'notifications',
                page_title = 'My Notifications';
            notifications.find({
                status: false,
                owner_id: id_string
            }).sort({
                date_created: -1
            }).exec(function (err_notifs, items_notifs) {

                if (err_notifs) console.log(err_notifs);

                if (items_notifs) {
                    // console.log(items_notifs);
                    notifs_count = items_notifs.length;
                    res_notifs = items_notifs;

                    res.render(page, {
                        url: process.env.URL_ROOT,
                        displayPic: req.user.displayPic,
                        user_info: req.user,
                        data: items_notifs,
                        page_title: page_title,
                        notifs_count:notifs_count,
                        pending_friend_notifs: pending_friend_notifs,

                        quest_page_status: false,
                        art_page_status: false,
                        riddle_page_status: false,
                        notice_page_status: false,
                        pab_page_status: false,
                        request_page_status: false,
                        trend_page_status: false,
                        home_page_status: true
                    });

                } else {
                    res.render(page, {
                        url: process.env.URL_ROOT,
                        displayPic: req.user.displayPic,
                        user_info: req.user,
                        data: items_notifs,
                        page_title: page_title,
                        pending_friend_notifs: pending_friend_notifs,

                        quest_page_status: false,
                        art_page_status: false,
                        riddle_page_status: false,
                        notice_page_status: false,
                        pab_page_status: false,
                        request_page_status: false,
                        trend_page_status: false,
                        home_page_status: true
                    });
                }

            });

        }); //end notifs

        }


    });

    router.get('/updateNotificationStatus', isLoggedIn, function (req, res) {
        console.log('inside update notifications')

        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Update your profile first"
            });
        } else {
            //update notification status
            item_id_obj = mongoose.Types.ObjectId(req.query.notif_id); //convert id string to obj id
            console.log('item obj ' + item_id_obj);
            var status_update = {
                status: true
            };
            notifications.findOneAndUpdate({
                _id: item_id_obj
            }, {
                $set: status_update
            }).exec(function (err_find, item_found) {
                if (err_find) {
                    console.log(err_find);
                    res.json({
                        success: false,
                        msg: "Notification update failed",
                        dest_url: ""
                    });
                }
                if (item_found) {
                    console.log('NOTITF RES ' + item_found);
                    res.json({
                        success: true,
                        msg: "Notification update successful",
                        dest_url: item_found.destination_url
                    });
                }

            });
        }

    });

    // routes
    app.use('/notifications', router)

}

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next()
    // if they aren't redirect them to the home page
    console.log('user not authenticated')
    res.redirect('/')
}