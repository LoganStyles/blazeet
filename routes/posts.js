module.exports = function (express, app, passport, database) {

    var router = express.Router();
    var mongoose = require('mongoose');

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
        var notifs_count = 0;
        process_posts.getNotifications(req.user, function (rel_notifs) {
            notifs_count = rel_notifs;

            var pending_friend_notifs = 0;
            process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                pending_friend_notifs = rel_notifs;

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

    /*
fetchs requests made by a user and requests made to a user
*/
    router.get('/getRequests', isLoggedIn, function (req, res) {
        var req_owner_count = 0,
            req_destination_count = 0,
            req_count = 0,
            pending_friend_notifs = 0,
            page = 'my_requests',
            page_title = 'My Requests',
            res_item_trend = [];

        //get trending stories for sidebar headlines::nb::this operation takes a while to complete,
        //try nesting or callbacks to prevent
        trend.find().sort({
            date_created: 1
        }).limit(5).exec(function (err_trend, item_trend) {

            if (err_trend) {
                //console.log(err_trend);
            }
            if (item_trend) {
                //console.log(item_trend);
                res_item_trend = item_trend;
            }

            var bookmark_len = req.user.bookmarks.length; //get saved bookmarks

            //find pending notifications length
            process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                pending_friend_notifs = rel_notifs;

                var notifs_count = 0;
                process_posts.getNotifications(req.user, function (rel_notifs) {
                    notifs_count = rel_notifs;

                    var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                    if (req.user.displayPic[0]) {
                        curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                    } //end display

                    //get total requests made by this user
                    var id_string = (req.user._id).toString();
                    request_model.find({
                        "owner.id": id_string
                    }).exec(function (err1, res1) {
                        if (err1) {
                            //console.log('err occured geting requests');
                            //console.log(err1);
                        }
                        req_owner_count = res1.length;

                        //get total requests to this user
                        request_model.find({
                            destination_id: id_string
                        }).exec(function (err2, res2) {
                            if (err2) {
                                //console.log('err occured geting requests');
                                //console.log(err2)
                            }

                            req_destination_count = res2.length;

                            //get total requests for this user
                            request_model.find({
                                $or: [{
                                    destination_id: id_string
                                }, {
                                    "owner.id": id_string
                                }]
                            }).exec(function (err3, res3) {
                                req_count = res3.length;


                                if (err3) {
                                    //console.log('err occured geting requests');
                                    //console.log(err3)
                                }


                                if (res3) {
                                    //update other details needed by the post
                                    res.render(page, {
                                        url: process.env.URL_ROOT,
                                        displayPic: curr_user_display_pic,
                                        user_info: req.user,
                                        req_owner_count: req_owner_count,
                                        req_destination_count: req_destination_count,
                                        req_count: req_count,
                                        data_trend: res_item_trend,
                                        page_title: page_title,
                                        class_type: 'my_requests',
                                        pending_friend_notifs: pending_friend_notifs,
                                        notifs_count: notifs_count,
                                        bookmarks_count: bookmark_len,

                                        quest_page_status: false,
                                        art_page_status: false,
                                        riddle_page_status: false,
                                        notice_page_status: false,
                                        pab_page_status: false,
                                        request_page_status: true,
                                        trend_page_status: false,
                                        home_page_status: false,
                                        usergroup_status: false
                                    });

                                } else {

                                    res.render(page, {
                                        url: process.env.URL_ROOT,
                                        displayPic: curr_user_display_pic,
                                        user_info: req.user,
                                        req_owner_count: req_owner_count,
                                        req_destination_count: req_destination_count,
                                        req_count: req_count,
                                        data_trend: res_item_trend,
                                        page_title: page_title,
                                        class_type: 'my_requests',
                                        pending_friend_notifs: pending_friend_notifs,
                                        bookmarks_count: bookmark_len,
                                        notifs_count: notifs_count,

                                        quest_page_status: false,
                                        art_page_status: false,
                                        riddle_page_status: false,
                                        notice_page_status: false,
                                        pab_page_status: false,
                                        request_page_status: true,
                                        trend_page_status: false,
                                        home_page_status: false,
                                        usergroup_status: false
                                    });

                                }


                            }); //end all requests


                        }); //end destination request

                    }); //end request

                }); //end notifs

            }); //end pending notifs


        }); //end trend

    });

    /*
    fetchs request details made by a user
    */
    router.get('/getOwnerRequestLists', isLoggedIn, function (req, res) {
        var req_owner_count = 0,
            req_destination_count = 0,
            req_count = 0,
            pending_friend_notifs = 0,
            page = 'my_requests_lists',
            page_title = 'My Requests',
            res_item_trend = [];

        //get list of trending stories for sidebar headlines::nb::this operation takes a while to complete,
        //try nesting or callbacks to prevent
        trend.find().sort({
            date_created: 1
        }).limit(5).exec(function (err_trend, item_trend) {

            if (err_trend) {
                //console.log(err_trend);
            }
            if (item_trend) {
                //console.log(item_trend);
                res_item_trend = item_trend;
            }

            var bookmark_len = req.user.bookmarks.length; //get saved bookmarks for sidebar

            //find pending notifications length
            process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                pending_friend_notifs = rel_notifs;

                var notifs_count = 0;
                process_posts.getNotifications(req.user, function (rel_notifs) {
                    notifs_count = rel_notifs;


                    var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                    if (req.user.displayPic[0]) {
                        curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                    } //end display

                    //get total requests for this user
                    var id_string = (req.user._id).toString();
                    request_model.find({
                        $or: [{
                            destination_id: id_string
                        }, {
                            "owner.id": id_string
                        }]
                    }).exec(function (err1, res1) {
                        if (err1) {
                            //console.log('err occured geting requests');
                            //console.log(err1)
                        }
                        req_count = res1.length;

                        //get total requests made by this user
                        request_model.find({
                            "owner.id": id_string
                        }).sort({
                            date_created: -1
                        }).exec(function (err3, res3) {
                            req_owner_count = res3.length;

                            if (err3) {
                                //console.log('err occured geting requests');
                                //console.log(err3)
                            }


                            if (req_owner_count > 0) {
                                //update other details needed by the post
                                process_posts.processPagePosts(res3, req.user, function (processed_response) {
                                    //console.log('MY REQUESTS LISTS .......................PROCESSED RESPONSE');
                                    //console.log(processed_response);

                                    res.render(page, {
                                        url: process.env.URL_ROOT,
                                        displayPic: curr_user_display_pic,
                                        user_info: req.user,
                                        data: processed_response,
                                        req_owner_count: req_owner_count,
                                        //page_response:item_response,
                                        req_count: req_count,
                                        data_trend: res_item_trend,
                                        page_title: page_title,
                                        class_type: 'my_requests_lists',
                                        pending_friend_notifs: pending_friend_notifs,
                                        bookmarks_count: bookmark_len,
                                        notifs_count: notifs_count,

                                        quest_page_status: false,
                                        art_page_status: false,
                                        riddle_page_status: false,
                                        notice_page_status: false,
                                        pab_page_status: false,
                                        request_page_status: true,
                                        trend_page_status: false,
                                        home_page_status: false,
                                        usergroup_status: false
                                    });

                                });

                            } else {

                                res.render(page, {
                                    url: process.env.URL_ROOT,
                                    displayPic: curr_user_display_pic,
                                    user_info: req.user,
                                    data: [],
                                    req_owner_count: req_owner_count,
                                    req_destination_count: req_destination_count,
                                    req_count: req_count,
                                    //page_response:item_response,
                                    data_trend: res_item_trend,
                                    page_title: page_title,
                                    class_type: 'my_requests_lists',
                                    pending_friend_notifs: pending_friend_notifs,
                                    bookmarks_count: bookmark_len,
                                    notifs_count: notifs_count,

                                    quest_page_status: false,
                                    art_page_status: false,
                                    riddle_page_status: false,
                                    notice_page_status: false,
                                    pab_page_status: false,
                                    request_page_status: false,
                                    trend_page_status: false,
                                    home_page_status: true,
                                    usergroup_status: false
                                });

                            }


                        }); //end all requests


                    }); //end request

                }); //end notifs


            }); //end pending friends


        }); //end trend

    });

    /*
    fetchs request details made to a user
    */
    router.get('/getDestinationRequestLists', isLoggedIn, function (req, res) {
        var req_owner_count = 0,
            req_destination_count = 0,
            req_count = 0,
            pending_friend_notifs = 0,
            page = 'my_requests_lists',
            page_title = 'My Requests',
            res_item_trend = [];

        //get list of trending stories for sidebar headlines::nb::this operation takes a while to complete,
        //try nesting or callbacks to prevent
        trend.find().sort({
            date_created: 1
        }).limit(5).exec(function (err_trend, item_trend) {

            if (err_trend) {
                console.log(err_trend);
            }
            if (item_trend) {
                console.log(item_trend);
                res_item_trend = item_trend;
            }

            var bookmark_len = req.user.bookmarks.length; //get saved bookmarks for sidebar

            //find pending notifications length
            process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                pending_friend_notifs = rel_notifs;

                var notifs_count = 0;
                process_posts.getNotifications(req.user, function (rel_notifs) {
                    notifs_count = rel_notifs;

                    var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                    if (req.user.displayPic[0]) {
                        curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                    } //end display

                    //get total requests for this user
                    var id_string = (req.user._id).toString();
                    request_model.find({
                        $or: [{
                            destination_id: id_string
                        }, {
                            "owner.id": id_string
                        }]
                    }).exec(function (err1, res1) {
                        if (err1) {
                            console.log('err occured geting requests');
                            console.log(err1)
                        }
                        req_count = res1.length;

                        //get total requests made by this user
                        request_model.find({
                            destination_id: id_string
                        }).sort({
                            date_created: -1
                        }).exec(function (err3, res3) {
                            req_destination_count = res3.length;

                            if (err3) {
                                console.log('err occured geting requests');
                                console.log(err3)
                            }


                            if (req_destination_count > 0) {
                                //update other details needed by the post
                                process_posts.processPagePosts(res3, req.user, function (processed_response) {
                                    console.log('MY REQUESTS LISTS .......................PROCESSED RESPONSE');
                                    console.log(processed_response);

                                    res.render(page, {
                                        url: process.env.URL_ROOT,
                                        displayPic: curr_user_display_pic,
                                        user_info: req.user,
                                        data: processed_response,
                                        req_owner_count: req_destination_count,
                                        //page_response:item_response,
                                        req_count: req_count,
                                        data_trend: res_item_trend,
                                        page_title: page_title,
                                        class_type: 'my_requests_lists',
                                        pending_friend_notifs: pending_friend_notifs,
                                        bookmarks_count: bookmark_len,
                                        notifs_count: notifs_count,

                                        quest_page_status: false,
                                        art_page_status: false,
                                        riddle_page_status: false,
                                        notice_page_status: false,
                                        pab_page_status: false,
                                        request_page_status: false,
                                        trend_page_status: false,
                                        home_page_status: true,
                                        usergroup_status: false
                                    });

                                });

                            } else {

                                res.render(page, {
                                    url: process.env.URL_ROOT,
                                    displayPic: curr_user_display_pic,
                                    user_info: req.user,
                                    data: [],
                                    req_owner_count: req_owner_count,
                                    req_destination_count: req_destination_count,
                                    req_count: req_count,
                                    //page_response:item_response,
                                    data_trend: res_item_trend,
                                    page_title: page_title,
                                    class_type: 'my_requests_lists',
                                    pending_friend_notifs: pending_friend_notifs,
                                    bookmarks_count: bookmark_len,
                                    notifs_count: notifs_count,

                                    quest_page_status: false,
                                    art_page_status: false,
                                    riddle_page_status: false,
                                    notice_page_status: false,
                                    pab_page_status: false,
                                    request_page_status: false,
                                    trend_page_status: false,
                                    home_page_status: true,
                                    usergroup_status: false
                                });

                            }


                        }); //end all requests


                    }); //end request

                }); //end notifs

            }); //end pending friends


        }); //end trend

    });

    /*
fetchs comments made for a response
*/
router.get('/getComments/:section/:section_id/:response_id/:answer_index', isLoggedIn, function (req, res) {
    var section_type = req.params.section;
    console.log('section type ' + section_type);
    var section_id = req.params.section_id;
    console.log('section_id ' + section_id);
    var comment_response_id = req.params.response_id;
    console.log('comment_response_id ' + comment_response_id);
    var comment_answer_index = req.params.answer_index;
    console.log('comment_answer_index ' + comment_answer_index);
    var comment_response_id_obj;
    var comment_section_id_obj;

    var req_owner_count = 0,
        req_destination_count = 0,
        req_count = 0,
        pending_friend_notifs = 0,
        page = 'all_comments',
        page_title = 'Comments',
        res_item_trend = [];

    //get list of trending stories for sidebar headlines
    trend.find().sort({
        date_created: 1
    }).limit(5).exec(function (err_trend, item_trend) {

        if (err_trend) {
            //console.log(err_trend);
        }
        if (item_trend) {
            //console.log(item_trend);
            res_item_trend = item_trend;
        }

        var bookmark_len = req.user.bookmarks.length; //get saved bookmarks for sidebar

        //find pending notifications length
        process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
        pending_friend_notifs = rel_notifs;

        var notifs_count = 0;
        process_posts.getNotifications(req.user, function (rel_notifs) {
        notifs_count = rel_notifs;


                var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                if (req.user.displayPic[0]) {
                    curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                } //end display

                //get total requests for this user
                var id_string = (req.user._id).toString();
                request_model.find({
                    $or: [{
                        destination_id: id_string
                    }, {
                        "owner.id": id_string
                    }]
                }).exec(function (err1, res1) {
                    if (err1) {
                        //console.log('err occured geting requests');
                        //console.log(err1)
                    }
                    req_count = res1.length;

                    //get all comments for selected answer
                    switch (section_type) {
                        case 'question':
                            section = question;
                            break;

                        case 'article':
                            section = article;
                            break;

                        case 'riddle':
                            section = riddle;
                            break;

                        case 'notice board':
                        case 'notice':
                            section = notice;
                            break;

                        case 'trend':
                        case 'trending':
                            section = trend;
                            break;

                        case 'pab':
                        case 'Post Books':
                            section = pab;
                            break;

                        case 'request':
                            section = request_model;
                            break;
                    }

                    comment_section_id_obj = mongoose.Types.ObjectId(section_id); //convert section id string to obj id

                    if (comment_response_id != 0) {
                        comment_response_id_obj = mongoose.Types.ObjectId(comment_response_id); //convert id string to obj id
                        update_query = {
                            _id: comment_section_id_obj,
                            'answers._id': comment_response_id_obj
                        };

                    } else {
                        update_query = {
                            _id: comment_section_id_obj
                        };
                    }


                    section.find(update_query).sort({
                        date_created: -1
                    }).exec(function (err3, res3) {

                        if (err3) {
                            console.log('err occured geting requests');
                            //console.log(err3)
                        } else if (res3) {
                            //console.log('res3 found');
                            //console.log(res3)
                            //update other details needed by the post
                            process_posts.processPagePosts(res3, req.user, function (processed_response) {
                                console.log('MY COMMENTS .......................PROCESSED RESPONSE');
                                console.log(processed_response);

                                res.render(page, {
                                    url: process.env.URL_ROOT,
                                    displayPic: curr_user_display_pic,
                                    user_info: req.user,
                                    data: processed_response,
                                    comments_count: processed_response[0].answers[0].comments.length,
                                    // req_owner_count:req_owner_count,
                                    //page_response:item_response,
                                    answer_index: parseInt(comment_answer_index),
                                    req_count: req_count,
                                    data_trend: res_item_trend,
                                    page_title: page_title,
                                    class_type: 'all_comments',
                                    pending_friend_notifs: pending_friend_notifs,
                                    bookmarks_count: bookmark_len,
                                    notifs_count: notifs_count,

                                    quest_page_status: false,
                                    art_page_status: false,
                                    riddle_page_status: false,
                                    notice_page_status: false,
                                    pab_page_status: false,
                                    request_page_status: false,
                                    trend_page_status: false,
                                    home_page_status: true,
                                    usergroup_status: false
                                });

                            });

                        } else {

                            res.render(page, {
                                url: process.env.URL_ROOT,
                                displayPic: curr_user_display_pic,
                                user_info: req.user,
                                data: [],
                                comments_count: 0,
                                req_owner_count: req_owner_count,
                                req_destination_count: req_destination_count,
                                req_count: req_count,
                                //page_response:item_response,
                                data_trend: res_item_trend,
                                page_title: page_title,
                                class_type: 'all_comments',
                                pending_friend_notifs: pending_friend_notifs,
                                bookmarks_count: bookmark_len,

                                quest_page_status: false,
                                art_page_status: false,
                                riddle_page_status: false,
                                notice_page_status: false,
                                pab_page_status: false,
                                request_page_status: false,
                                trend_page_status: false,
                                home_page_status: true,
                                usergroup_status: false
                            });

                        }


                    }); //end all requests


                }); //end request

            }); //end notifs

        }); //end pending friends


    }); //end trend

});


router.post('/update_meta/:type/:id/:action/:subitem_id',function(req,res,next){
    var section_type=req.params.type;
    var id=req.params.id;
    var action=req.params.action;
    var subitem_id=req.params.subitem_id;
    var user_id=req.user._id;
    var update_param='';
    var update_query={_id:id};
    var action_msg="";
    var subitem_id_obj;

    console.log('section_type '+section_type)
    console.log('id '+id)
    console.log('action '+action)
    console.log('subitem_id '+subitem_id)
    
    console.log('user_id '+user_id)

    switch(section_type){
        case'question':
        section = question;
        break;

        case'article':
        section = article;
        break;

        case'riddle':
        section = riddle;
        break;

        case'notice_board':
        section = notice;
        break;

        case'suggestion':
        section = suggestion;
        break;
    }

    switch(action){
        case'likes': 
        action_msg="like";       
        update_query = {_id:id,likes:user_id};
        update_param={likes:user_id};
        break;
        case'attending':  
        action_msg="attending";      
        update_query = {_id:id,attending:user_id};
        update_param={attending:user_id};
        break;
        case'not_attending':  
        action_msg="not_attending";      
        update_query = {_id:id,not_attending:user_id};
        update_param={not_attending:user_id};
        break;
        case'shares':
        update_param = {shares:1};
        break;
        case'upvotes':
        subitem_id_obj = mongoose.Types.ObjectId(subitem_id);//convert id string to obj id
        if(subitem_id){
            update_query={_id:id,'answers._id':subitem_id_obj,'answers.upvotes':user_id};
            update_query2={_id:id,'answers._id':subitem_id_obj};
            update_param = {'answers.$.upvotes':user_id};
        }
        
        break;

        case'downvotes':
        subitem_id_obj = mongoose.Types.ObjectId(subitem_id);//convert id string to obj id
        if(subitem_id){
            update_query={_id:id,'answers._id':subitem_id_obj,'answers.downvotes':user_id};
            update_query2={_id:id,'answers._id':subitem_id_obj};
            update_param = {'answers.$.downvotes':user_id};
        }
        
        break;
    }

    switch(action){
        case 'likes':
        case 'attending':
        case 'not_attending':
        
        
        section.find(update_query,function(err1,res1){
            if(err1){
                //console.log('likes err1')
                console.log(err1)
            }else if(res1){

            //send notification
            // var notifiers=req.user.friends;
            // var notif_type="new_vote";
            // var section_name=section_type;
            // var section_id=id;
            // var section_resp_id=subitem_id;
            // var section_pic=req.user.displayPic[0];
            // var url=process.env.URL_ROOT+"/posts/section/"+section_name+"/all_responses/"+section_id;
            // var msg=req.user.displayName+" voted on a "+section_name;
            // var curr_user_id=req.user._id;

            // process_notifs.saveNotifs(notifiers,notif_type,section_id,section_name,section_resp_id,section_pic,url,msg,curr_user_id,function(items_notifs){

                //console.log('likes response2')
                console.log(res1);
                //if data is found, remove user id else insert user id
                if(res1.length >0){
                    section.update({_id:id},{$pull:update_param},function(err2,res2){
                        if(err2){
                            console.log(err2)
                            res.json({success:false,msg:"Operation update failed"});
                        }else{
                            console.log(res2)
                            res.json({success:true,msg:"Operation update succesful",action:"un"+action_msg});
                        }

                    });
                }else{
                    section.update({_id:id},{$push:update_param},function(err3,res3){
                        if(err3){
                            console.log(err3)
                            res.json({success:false,msg:"Operation update failed"});
                        }else{
                            console.log(res3)
                            res.json({success:true,msg:"Operation update succesful",action:action_msg});
                        }

                    });
                }
            //});
            }


        });

        break;
        case 'upvotes':
        case 'downvotes':
        action_msg="votes";
        
        section.find(update_query,function(err1,res1){
            if(err1){
                console.log('likes err1')
                console.log(err1)
            }else if(res1){
                //send notification
                var notifiers=req.user.friends;
                var notif_type="new_vote";
                var section_name=section_type;
                var section_id=id;
                var section_resp_id=subitem_id;
                var section_pic=req.user.displayPic[0];
                var url=process.env.URL_ROOT+"/posts/section/"+section_name+"/all_responses/"+section_id;
                var msg=req.user.displayName+" voted on a "+section_name;
                var curr_user_id=req.user._id;

                process_notifs.saveNotifs(notifiers,notif_type,section_id,section_name,section_resp_id,section_pic,url,msg,curr_user_id,function(items_notifs){
                
                console.log('upvotes res1')
                console.log(res1);
                //if data is found:user existed
                if(res1.length >0){

                    section.update(update_query2,{$pull:update_param},function(err2,res2){
                        if(err2){
                            console.log(err2)
                            res.json({success:false,msg:"Operation update failed"});
                        }else{
                            console.log(res2)
                            res.json({success:true,msg:"Operation update succesful",action:"un"+action_msg});
                        }

                    });

                }else{
                    //add new user
                    section.update(update_query2,{$push:update_param},function(err3,res3){

                        if(err3){
                            console.log(err3)
                            res.json({success:false,msg:"Operation update failed"});
                        }else{
                            console.log(res3)
                            res.json({success:true,msg:"Operation update succesful",action:action_msg});
                        }

                    });

                }

            });
                
            }


        });
        break;
        default:
        section.update(update_query,{$inc:update_param},function(error,response){

            if(error){
            // console.log(error)
            res.json({success:false,msg:"Update failed"});
        }else{
            // console.log(response)
            res.json({success:true,msg:"Update succesful"});
        }


    });
        break;
    }


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