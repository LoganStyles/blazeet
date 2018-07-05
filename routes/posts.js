module.exports = function (express, app, passport, database) {

    var router = express.Router();

    //models
    var about = require('../models/about');
    var trend = require('../models/trend');
    var user = require('../models/user');
    var notifications = require('../models/notifications');
    var request_model = require('../models/request');
    var question = require('../models/question');
    var article = require('../models/article');
    var riddle = require('../models/riddle');
    var pab = require('../models/pab');
    var notice = require('../models/notice');

    var activeConn = require('../models/activeConnections');

    var trend_cat = require('../models/trend_cats');
    var quest_cat = require('../models/question_cats');
    var art_cat = require('../models/article_cats');
    var riddle_cat = require('../models/riddle_cats');
    var pab_cat = require('../models/pab_cats');
    var notice_cat = require('../models/notice_cats');

    //processor
    var process_posts = require('../applicationManager/processor');
    var process_notifs = require('../applicationManager/notifs');

    /*get all posted questions,*/
    router.get('/section/:item/:type/:id', isLoggedIn, function (req, res) {
        console.log('inside all sections');

        var item = req.params.item;
        var type = req.params.type;
        var id = req.params.id;
        console.log('item ' + item);
        console.log('type ' + type);
        console.log('id ' + id);

        //set status defaults
        let question_page_status = false,
            home_page_status = false,
            riddle_page_status = false,
            pab_page_status = false,
            article_page_status = false,
            notice_page_status = false,
            trend_page_status = false,
            request_page_status = false,
            post_owner = false,
        usergroup_page_status = false;

        let page_icon = item + 's_icon.png'; //post icon

        var selection, section;
        var page = 'section';
        page_type = item;

        //chk the type of post
        switch (type) {
            case 'All':
                selection = {};
                page_title = type + ' ' + item + 's';
                break;

            case 'Unanswered':
            case 'Unreviewed':
            case 'Unresolved':
                selection = {
                    answers: {
                        $size: 0
                    }
                };
                page_title = type + ' ' + item + 's';
                break;

                //get only answered questions/articles/riddles
            case 'Answered':
            case 'Reviewed':
            case 'Solved':
                selection = {
                    "answers_len": {
                        "$gt": 0
                    }
                };
                page = 'section_response';
                page_title = type + ' ' + item + 's';
                break;

                //get only answers for a question/article etc
            case 'all_responses':
                if (id) {
                    selection = {
                        _id: id
                    };
                    page = 'section_all_response';

                    switch (item) {
                        case 'question':
                            page_title = 'Answer';
                            break;

                        case 'article':
                            page_title = 'Review';
                            break;
                        case 'riddle':
                            page_title = 'Solution';
                            break;
                        case 'pab':
                            page_title = 'Post Books';
                            break;
                        case 'notice':
                        case 'notice board':
                            page_title = 'Notices';
                            break;
                        case 'trend':
                        case 'trending':
                            page_title = 'Trending';
                            break;

                        case 'suggestion':
                            page_title = 'Suggestions';
                            break;
                    }
                }
                break;

                //get single pages for trends etc
            case 'single':
                if (id) {
                    selection = {
                        _id: id
                    };
                    page = 'single';
                    page_title = '';
                }
                break;

            default: //process 'all_..' e.g get rows excluding a particular id
                var stripped = stipInputCase(type);
                selection = {
                    'category': stripped,
                    '_id': {
                        '$nin': [id]
                    }
                };
                page = 'section';
                page_title = 'Others';
                break;
        }

        switch (item) {
            case 'question':
                section = question;
                question_page_status = true;
                item_response = 'answer';
                break;

            case 'article':
                section = article;
                article_page_status = true;
                item_response = 'review';
                break;

            case 'riddle':
                section = riddle;
                riddle_page_status = true;
                item_response = 'solution';
                break;

            case 'pab':
            case 'Post Books':
                section = pab;
                pab_page_status = true;
                item_response = '';
                page_type = 'Post Books';
                break;

            case 'request':
                section = request_model;
                request_page_status = true;
                item_response = '';
                page_type = 'Requests';
                break;

            case 'notice':
            case 'notice board':
                section = notice;
                notice_page_status = true;
                item_response = '';
                page = 'notice';
                break;

            case 'suggestion':
                section = suggestion;
                item_response = '';
                usergroup_page_status = true;
                break;

            case 'trend':
            case 'trending':
                section = trend;
                trend_page_status = true;
                item_response = '';
                page_type = 'Trending';
                break;
        }

        //find pending notifications length
        var pending_friend_notifs = 0;
        var notifs_count = 0;
        process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
            pending_friend_notifs = rel_notifs;

            var id_string = (req.user._id).toString();
            //get unviewed notifications
            notifications.find({
                status: false,
                owner_id: id_string
            }).sort({
                date_created: -1
            }).exec(function (err_notifs, item_notifs) {
                if (err_notifs) console.log(err_notifs)
                if (item_notifs)
                    notifs_count = item_notifs.length;

                //get required data
                section.find(selection).sort({
                    post_date: -1
                }).exec(function (err, items) {

                    var res_items = [];
                    var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                    if (req.user.displayPic[0]) {
                        curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                    }

                    if (err) {
                        console.log(err);
                    } else if (items) {
                        //items were found
                        /*for each item update owner details such as displayPic & displayName
                        since these may have changed*/
                        if (items.length > 0) {

                            console.log('items ' + items)

                            process_posts.processPagePosts(items, req.user, function (processed_response) {

                                console.log('processed_response ' + processed_response)

                                res.render(page, {
                                    url: process.env.URL_ROOT,
                                    displayPic: curr_user_display_pic,
                                    user_info: req.user,
                                    data: processed_response,
                                    data_item: item,
                                    page_title: page_title,
                                    page_type: page_type,
                                    class_type: item,
                                    page_response: item_response,
                                    page_icon: page_icon,
                                    notifs_count: notifs_count,
                                    pending_friend_notifs: pending_friend_notifs,

                                    quest_page_status: question_page_status,
                                    art_page_status: article_page_status,
                                    riddle_page_status: riddle_page_status,
                                    request_page_status: request_page_status,
                                    notice_page_status: notice_page_status,
                                    pab_page_status: pab_page_status,
                                    trend_page_status: trend_page_status,
                                    home_page_status: home_page_status,
                                    usergroup_page_status: usergroup_page_status
                                });

                            });

                        } else {
                            res.render(page, {
                                url: process.env.URL_ROOT,
                                displayPic: curr_user_display_pic,
                                user_info: req.user,
                                data: res_items,
                                data_item: item,
                                page_title: page_title,
                                page_type: page_type,
                                class_type: item,
                                page_response: item_response,
                                page_icon: page_icon,
                                pending_friend_notifs: pending_friend_notifs,
                                notifs_count: notifs_count,

                                quest_page_status: question_page_status,
                                art_page_status: article_page_status,
                                riddle_page_status: riddle_page_status,
                                request_page_status: request_page_status,
                                notice_page_status: notice_page_status,
                                pab_page_status: pab_page_status,
                                trend_page_status: trend_page_status,
                                home_page_status: home_page_status,
                                usergroup_page_status: usergroup_page_status
                            });

                        }

                    }

                }); //end section

            });

        }); //end notifs


    });

    function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) return next()
        // if they aren't redirect them to the home page
        console.log('user not authenticated')
        res.redirect('/')
    }

    function stipInputCase(param) {
        var categ = param.replace("all_", "");
        console.log('CATEG ' + categ)
        return categ;
    }

    // routes
    app.use('/posts', router)
}