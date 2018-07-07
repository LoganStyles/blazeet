module.exports = function (app, io) {

    var async = require('async'),
        multer = require('multer'),
        mime = require('mime-lib'),
        moment = require('moment'),
        striptags = require('striptags')
    mongoose = require('mongoose')
    path = require('path');

    var Handlebars = require('handlebars');
    var MomentHandler = require("handlebars.moment");
    MomentHandler.registerHelpers(Handlebars);
    var just_hb_helper = require('just-handlebars-helpers');
    just_hb_helper.registerHelpers(Handlebars);

    var Storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './public/uploads') //set the destination
        },
        filename: function (req, file, cb) {
            console.log('filename ext ' + file.mimetype);
            console.log(mime.extension(file.mimetype));
            cb(null, Date.now() + '.' + mime.extension(file.mimetype)[mime.extension(file.mimetype).length - 1]);
        }
    });

    var upload = multer({
        storage: Storage,
        fileFilter: function (req, file, callback) {
            var ext = path.extname(file.originalname);
            if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg' && ext !== '.pdf') {
                //return callback(new Error('Invalid file upload'))
                return callback(null, false)
            }
            callback(null, true)
        },
        limits: {
            fileSize: 1048576 * 2
        }

    });
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

    app.use(function (req, res, next) {
        // we'll be able to utilize authentication here later
        console.log(req.method, req.url)
        next()
    })

    // HOME PAGE ==============================
    app.get('/', function (req, res) {
        about.findOne({
            id: 1
        }, function (error, result) {
            var res_data = [];
            if (error) {
                console.log(error)
            } else if (result) {
                res_data = result;
            }

            res.render('index', {
                title: 'Home',
                url: process.env.URL_ROOT,
                data: res_data
            });

        });

    });

    /*
    fetch at most 5 rows from each section,
    sort them by date_created
    */
    app.get('/feeds', isLoggedIn, function (req, res) {
        // console.log('inside feeds');
        //page defaults
        var skip_val = 0,
            req_count = 0,
            limit_val = 2,
            page = 'feeds',
            page_title = '',
            notifs_count = 0,
            page_results = [],
            res_item_trend = [],
            res_item_experts = [];

        //get trending stories for sidebar headlines::nb::this operation takes a while to complete,
        //try nesting or callbacks to prevent
        trend.find().sort({
            date_created: 1
        }).limit(limit_val).exec(function (err_trend, item_trend) {

            if (err_trend) {
                //console.log(err_trend);
            }
            if (item_trend) {
                console.log('DATA TREND ITEM')
                //console.log(item_trend);
                res_item_trend = item_trend;
            }

            //get experts
            user.find({
                level: 'expert'
            }).sort({
                date_created: 1
            }).exec(function (err_expert, item_expert) {

                if (err_expert) {
                    //console.log(err_trend);
                }
                if (item_expert) {
                    console.log('DATA EXPERT ITEM')
                    // console.log(item_expert);
                    res_item_experts = item_expert;
                }

                process_posts.getNotifications(req.user, function (item_notifs) {
                    notifs_count = item_notifs.length;

                    //get total requests for this user
                    var id_string = (req.user._id).toString();
                    request_model.find({
                        $or: [{
                            destination_id: id_string
                        }, {
                            "owner.id": id_string
                        }]
                    }).exec(function (err1, res1) {
                        req_count = res1.length;

                        var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                        if (req.user.displayPic[0]) {
                            curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                        }

                        var bookmark_len = req.user.bookmarks.length; //get saved bookmarks

                        var pending_friend_notifs = 0;
                        process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                            pending_friend_notifs = rel_notifs;
                            // console.log(pending_friend_notifs)

                            //using async get the last 5 results from each collection
                            async.concat([question, article, riddle, pab, trend, notice], function (model, callback) {
                                    var query = model.find({}).sort({
                                        "date_created": -1
                                    });
                                    // }).skip(skip_val).limit(limit_val);
                                    query.exec(function (err, docs) {
                                        if (err) {
                                            console.log('err in query');
                                            console.log(err);
                                        } else if (docs) {
                                            callback(err, docs);
                                        }

                                    });
                                },
                                function (err2, res_items) {
                                    if (err2) {
                                        console.log('err2 ')
                                    } else if (res_items) {
                                        //results are now merged so sort by date
                                        page_results = res_items.sort(function (a, b) {
                                            return (a.date_created < b.date_created) ? 1 : (a.date_created > b.date_created) ? -1 : 0;
                                        });
                                        // console.log('sorted page_results')
                                        // console.log(page_results);
                                    }

                                    if (page_results.length > 0) {
                                        //update other details needed by the post
                                        process_posts.processPagePosts(page_results, req.user, function (processed_response) {
                                            console.log('PROCESSED RESPONSE');
                                            // console.log(processed_response);

                                            // curr_user_string=(req.user._id).toString();
                                            // activeConn.find({clientId:curr_user_string}).sort({date_created:-1}).exec(function(err_active,actives){
                                            //     if(err_active)console.log(err_active)
                                            //     if(actives.length >0){
                                            //         console.log(actives)
                                            //         //send notif
                                            //         // console.log('socket id11111111111111111111111111 '+actives[0].socketId);
                                            //         var curr_socketId=actives[0].socketId
                                            //         // var curr_socketId=mongoose.Types.ObjectId(actives.socketId)
                                            //         console.log('socket id '+curr_socketId);
                                            //         io.emit( 'update_notification_count', 'some thing notified');
                                            //     }

                                            // });

                                            res.render(page, {
                                                url: process.env.URL_ROOT,
                                                displayPic: curr_user_display_pic,
                                                user_info: req.user,
                                                data: processed_response,
                                                data_trend: res_item_trend,
                                                data_experts: res_item_experts,
                                                page_title: page_title,
                                                class_type: 'dashboard_page',
                                                pending_friend_notifs: pending_friend_notifs,
                                                notifs_count: notifs_count,
                                                req_count: req_count,
                                                bookmarks_count: bookmark_len,

                                                quest_page_status: false,
                                                art_page_status: false,
                                                riddle_page_status: false,
                                                notice_page_status: false,
                                                pab_page_status: false,
                                                request_page_status: false,
                                                trend_page_status: false,
                                                home_page_status: true
                                            });

                                        });

                                    } else {
                                        console.log('PAGE RESULTS INITIALLY EMPTY')

                                        res.render(page, {
                                            url: process.env.URL_ROOT,
                                            displayPic: curr_user_display_pic,
                                            user_info: req.user,
                                            data: page_results,
                                            data_trend: res_item_trend,
                                            data_experts: res_item_experts,
                                            page_title: page_title,
                                            class_type: 'dashboard_page',
                                            pending_friend_notifs: pending_friend_notifs,
                                            notifs_count: notifs_count,
                                            req_count: req_count,
                                            bookmarks_count: bookmark_len,

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

                        }); //end pending friends

                    }); //end request

                }); //end full nofications

            }); //end experts


        }); //end trend

    });

    /*
fetch rows that contain the searched item,
sort them by date_created
*/
    app.get('/quicksearch', isLoggedIn, function (req, res) {
        //page defaults
        var skip_val = 0,
            req_count = 0,
            limit_val = 5,
            page = 'quicksearch',
            page_title = 'search results',
            page_results = [],
            regx = "",
            res_item_trend = [];

        if (req.query.dom_search_item) {
            regx = new RegExp(escapeRegex(req.query.dom_search_item), 'gi');

        } else {
            regx = "";
        }

        //get trending stories for sidebar headlines
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

            //get total requests for this user
            var id_string = (req.user._id).toString();
            request_model.find({
                $or: [{
                    destination_id: id_string
                }, {
                    "owner.id": id_string
                }]
            }).exec(function (err1, res1) {
                req_count = res1.length;

                var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                if (req.user.displayPic[0]) {
                    curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                } //end display

                var bookmark_len = req.user.bookmarks.length; //get saved bookmarks

                var pending_friend_notifs = 0;
                process_posts.getPendingFriendsCount(req.user, function (pending) {
                    pending_friend_notifs = pending;

                    var notifs_count = 0;
                    process_posts.getNotifications(req.user, function (rel_notifs) {
                        notifs_count = rel_notifs;

                        //using async get results from each collection
                        async.concat([question, article, riddle, pab, trend, notice], function (model, callback) {
                                var query = model.find({
                                    "body": regx
                                }).sort({
                                    "date_created": -1
                                });
                                query.exec(function (err, docs) {
                                    if (err) {
                                        //console.log('err in query');
                                        console.log(err);
                                    } else if (docs) {
                                        callback(err, docs);
                                    }

                                });
                            },
                            function (err2, res_items) {
                                if (err2) {
                                    console.log(err2)
                                } else if (res_items) {
                                    //results are now merged so sort by date
                                    page_results = res_items.sort(function (a, b) {
                                        return (a.date_created < b.date_created) ? 1 : (a.date_created > b.date_created) ? -1 : 0;
                                    });
                                }

                                if (page_results.length > 0) {
                                    //update other details needed by the post
                                    process_posts.processPagePosts(page_results, req.user, function (processed_response) {
                                        //console.log('PROCESSED RESPONSE');
                                        //console.log(processed_response);

                                        res.render(page, {
                                            url: process.env.URL_ROOT,
                                            displayPic: curr_user_display_pic,
                                            user_info: req.user,
                                            data: processed_response,
                                            data_trend: res_item_trend,
                                            page_title: page_title,
                                            class_type: 'quicksearch_page',
                                            pending_friend_notifs: pending_friend_notifs,
                                            req_count: req_count,
                                            notifs_count: notifs_count,
                                            bookmarks_count: bookmark_len,

                                            quest_page_status: false,
                                            art_page_status: false,
                                            riddle_page_status: false,
                                            notice_page_status: false,
                                            pab_page_status: false,
                                            request_page_status: false,
                                            trend_page_status: false,
                                            home_page_status: true
                                        });

                                    });

                                } else {
                                    //console.log('PAGE RESULTS INITIALLY EMPTY')

                                    res.render(page, {
                                        url: process.env.URL_ROOT,
                                        displayPic: curr_user_display_pic,
                                        user_info: req.user,
                                        data: page_results,
                                        data_trend: res_item_trend,
                                        page_title: page_title,
                                        class_type: 'quicksearch_page',
                                        pending_friend_notifs: pending_friend_notifs,
                                        req_count: req_count,
                                        notifs_count: notifs_count,
                                        bookmarks_count: bookmark_len,

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

                }); //end pending friends

            }); //end request


        }); //end trend


    });
    //-------------------------------------------
    //PROFILE
    //-------------------------------------------
    /*updates the description on the profile */
    app.post('/update_desc', function (req, res, next) {
        var update_desc = {
            description: req.body.profile_desc_description
        };

        user.findOneAndUpdate({
            email: req.user.email
        }, {
            $currentDate: {
                date_modified: true
            },
            $set: update_desc
        }, function (err1, res1) {

            if (err1) {
                console.log(err1)
                res.json({
                    success: false,
                    msg: "Your profile update failed"
                });
            }
            if (res1) {
                res.json({
                    success: true,
                    msg: "Your profile update was successfull"
                });
            }

        });

    });

    /*adds/edits the education items on the profile */
    app.post('/update_edu', function (req, res, next) {
        var action = req.body.profile_edu_action;

        user.findOne({
            email: req.user.email
        }, function (err, u) {
            if (u) {
                let updateUser = u;

                //chk for either inserts/edits
                if (action == "insert") {
                    var update_items = {
                        title: req.body.profile_edu_title,
                        from_year: req.body.profile_edu_from,
                        to_year: req.body.profile_edu_to
                    }

                    updateUser.education.push(update_items); //append education items
                    updateUser.date_modified = new Date();
                    console.log(updateUser);

                    user.updateOne({
                        email: req.user.email
                    }, {
                        $set: updateUser
                    }, function (err1, res1) {

                        if (err1) {
                            console.log(err1)
                            res.json({
                                success: false,
                                msg: "Your education details update failed"
                            });
                        } else if (res1) {
                            res.json({
                                success: true,
                                msg: "Your education details update was successfull"
                            });
                        }

                    });

                } else if (action == "edit" && (req.body.profile_edu_id)) {
                    //modify existing items
                    user.updateOne({
                            _id: req.user._id,
                            "education._id": req.body.profile_edu_id
                        }, {
                            $set: {
                                "education.$.title": req.body.profile_edu_title,
                                "education.$.to_year": req.body.profile_edu_to,
                                "education.$.from_year": req.body.profile_edu_from
                            }
                        },
                        function (err2, res2) {
                            if (err2) {
                                console.log(err2)
                                res.json({
                                    success: false,
                                    msg: "Your education details update failed"
                                });
                            } else if (res2) {
                                res.json({
                                    success: true,
                                    msg: "Your education details update was successfull"
                                });
                            }
                        });
                }

            } else {
                res.json({
                    success: false,
                    msg: "User not found!"
                });
            }

        });

    });

    /*updates the qualifications on the profile */
    app.post('/update_qual', function (req, res, next) {

        user.findOne({
            email: req.user.email
        }, function (err, u) {
            if (u) {
                let updateUser = u;

                //chk for either inserts/edits
                if (req.body.profile_qual_action == "insert") {

                    var update_items = {
                        title: req.body.profile_qual_title,
                        year: req.body.profile_qual_year
                    }

                    updateUser.qualification.push(update_items); //append education items
                    updateUser.date_modified = new Date();
                    console.log(updateUser);

                    user.updateOne({
                        email: req.user.email
                    }, {
                        $set: updateUser
                    }, function (err1, res1) {

                        if (err1) {
                            console.log(err1)
                            res.json({
                                success: false,
                                msg: "Your qualifications update failed"
                            });
                        } else if (res1) {
                            res.json({
                                success: true,
                                msg: "Your qualifications update was successfull"
                            });
                        }

                    });

                } else if (req.body.profile_qual_action == "edit" && (req.body.profile_qual_id)) {

                    //modify existing items
                    user.updateOne({
                            _id: req.user._id,
                            "qualification._id": req.body.profile_qual_id
                        }, {
                            $set: {
                                "qualification.$.title": req.body.profile_qual_title,
                                "qualification.$.year": req.body.profile_qual_year
                            }
                        },
                        function (err2, res2) {
                            if (err2) {
                                console.log(err2)
                                res.json({
                                    success: false,
                                    msg: "Your qualifications details update failed"
                                });
                            } else if (res2) {
                                res.json({
                                    success: true,
                                    msg: "Your qualifications details update was successfull"
                                });
                            }
                        });
                }

            } else {
                res.json({
                    success: false,
                    msg: "User not found!"
                });
            }

        });

    });

    /*updates the schools on the profile */
    app.post('/update_sch', function (req, res, next) {

        user.findOne({
            email: req.user.email
        }, function (err, u) {
            if (u) {
                let updateUser = u;
                //chk for either inserts/edits
                if (req.body.profile_sch_action == "insert") {

                    var update_items = {
                        title: req.body.profile_sch_title,
                    }

                    updateUser.schools.push(update_items); //append education items
                    updateUser.date_modified = new Date();
                    console.log(updateUser);

                    user.updateOne({
                        email: req.user.email
                    }, {
                        $set: updateUser
                    }, function (err1, res1) {

                        if (err1) {
                            console.log(err1)
                            res.json({
                                success: false,
                                msg: "Your school details update failed"
                            });
                        } else if (res1) {
                            res.json({
                                success: true,
                                msg: "Your school details update was successfull"
                            });
                        }

                    });

                } else if (req.body.profile_sch_action == "edit" && (req.body.profile_sch_id)) {

                    //modify existing items
                    user.updateOne({
                            _id: req.user._id,
                            "schools._id": req.body.profile_sch_id
                        }, {
                            $set: {
                                "schools.$.title": req.body.profile_sch_title
                            }
                        },
                        function (err2, res2) {
                            if (err2) {
                                console.log(err2)
                                res.json({
                                    success: false,
                                    msg: "Your school details update failed"
                                });
                            } else if (res2) {
                                res.json({
                                    success: true,
                                    msg: "Your school details update was successfull"
                                });
                            }
                        });
                }

            } else {
                res.json({
                    success: false,
                    msg: "User not found!"
                });
            }

        });

    });

    /*updates bio1*/
    var profile_upload = upload.fields([{
            name: 'profile_bio1_displayPic',
            maxCount: 1
        },
        {
            name: 'profile_bio1_backgroundPic',
            maxCount: 1
        }
    ]);

    app.post('/update_bio1', profile_upload, function (req, res, next) {
        // console.log(req.body);

        var dob = moment(req.body.profile_bio1_dob, 'MM/DD/YYYY');
        // console.log(dob);

        designation_updates = {
            title: req.body.profile_bio1_designation,
            body: ''
        }

        user.findOne({
            email: req.user.email
        }, function (err, u) {
            if (u) {
                let updateUser = u;
                updateUser.firstname = req.body.profile_bio1_firstname;
                updateUser.lastname = req.body.profile_bio1_lastname;
                updateUser.location = req.body.profile_bio1_location;
                updateUser.dob = dob;
                updateUser.displayName = updateUser.firstname + ' ' + updateUser.lastname;
                updateUser.date_modified = new Date();
                updateUser.designation.push(designation_updates);

                //store img if it exists
                if (req.files && req.files['profile_bio1_displayPic']) {
                    console.log('filename ' + req.files['profile_bio1_displayPic'][0].filename)
                    updateUser.displayPic.push('uploads/' + req.files['profile_bio1_displayPic'][0].filename);
                }

                if (req.files && req.files['profile_bio1_backgroundPic']) {
                    console.log('filename ' + req.files['profile_bio1_backgroundPic'][0].filename)
                    updateUser.backgroundPic.push('uploads/' + req.files['profile_bio1_backgroundPic'][0].filename);
                }
                console.log(updateUser);
                user.updateOne({
                    email: req.user.email
                }, {
                    $set: updateUser
                }, function (err1, res1) {

                    if (err1) {
                        console.log(err1)
                        res.json({
                            success: false,
                            msg: "Your profile update failed"
                        });
                    } else if (res1) {
                        res.json({
                            success: true,
                            msg: "Your profile update was successfull"
                        });
                    }

                });
            }

        });

    });



    /*POSTS*/
    //------------------------------------------
    /*process an 'ask a question' post,save & update UI immediately*/
    app.post('/ask_question', upload.single('question_photo'), function (req, res, next) {
        console.log('req.file')
        console.log(req.file);

        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Your post failed, please update your profile first"
            });
        } else {

            var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
            var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
            var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
            var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');

            var owner_details = {
                id: res_id,
                displayName: display_name,
                displayPic: displayPic,
                status: status
            };

            let ask_quest = new question();
            ask_quest.post_type = "question";
            ask_quest.access = 1; //default :public access
            ask_quest.body = (req.body.question_title);
            // ask_quest.body = convertToSentencCase(req.body.question_title);
            ask_quest.category = req.body.question_category;
            ask_quest.sub_cat1 = req.body.question_sub1;
            ask_quest.sub_cat2 = req.body.question_sub2;
            ask_quest.description = req.body.question_info;
            ask_quest.owner = owner_details;
            ask_quest.shared_body = striptags(req.body.question_title);
            ask_quest.shared_description = striptags(req.body.question_info);
            // ask_quest.shared_description=striptags(req.body.question_info,[],'\n');

            if (req.file && req.file.filename != null) {
                ask_quest.pics.push('uploads/' + req.file.filename);
            }

            ask_quest.save(function (err1, saved_quest) {

                if (err1) {
                    console.log(err1);
                    res.json({
                        success: false,
                        msg: "question submission failed"
                    });

                } else {
                    //send notification if user has friends
                    var notifiers = req.user.friends;

                    if (notifiers.length > 0) {
                        var notif_type = "new_post";
                        var section_name = "question";
                        var section_id = saved_quest._id;
                        var section_resp_id = "";
                        var section_pic = req.user.displayPic[0];
                        var url = process.env.URL_ROOT + "/posts/section/" + section_name + "/all_responses/" + saved_quest._id;
                        var msg = req.user.displayName + " posted a question";
                        var curr_user_id = req.user._id;

                        process_notifs.saveNotifs(notifiers, notif_type, section_id, section_name, section_resp_id, section_pic, url, msg, curr_user_id, function (items_notifs) {
                            console.log('RECEIVE NOTIFS ' + items_notifs)

                            if (items_notifs) {
                                //update user's question_ids
                                user.findOne({
                                    _id: req.user._id
                                }, function (uerr, udata) {
                                    if (udata) {
                                        let updateUser = udata;
                                        updateUser.question_ids.push(saved_quest._id);
                                        updateUser.question_ids = updateUser.question_ids.filter(onlyUnique); //remove duplicate entries

                                        user.updateOne({
                                            _id: req.user._id
                                        }, {
                                            $set: updateUser
                                        }, function (err2, res2) {

                                            if (err2) {
                                                console.log("Unable to update user's questions")
                                            } else if (res2) {
                                                // console.log("updated user's questions")  

                                                var page_results = [];
                                                console.log(saved_quest);
                                                page_results.push(saved_quest);

                                                process_posts.processPagePosts(page_results, req.user, function (processed_response) {
                                                    //console.log('JSON PROCESSED RESPONSE');
                                                    //console.log(processed_response);
                                                    var json = JSON.stringify(processed_response[0], null, 2);

                                                    // console.log(json);//update feeds,all questions & unanswered quests
                                                    console.log('emitting...')
                                                    io.emit('new_questions', json);
                                                    res.json({
                                                        success: true,
                                                        msg: "Question submission succesful"
                                                    });

                                                });
                                            }

                                        });

                                    } else {
                                        console.log("Updated user's questions");
                                        res.json({
                                            success: false,
                                            msg: "user profile not found"
                                        });
                                    }

                                });
                            }

                        });

                    } else {
                        res.json({
                            success: true,
                            msg: "Question submission succesful"
                        });
                    }


                }
            });

        }

    });

    /*process an 'write an article' post,save & update UI immediately*/
    var article_upload = upload.fields([{
            name: 'article_attachment',
            maxCount: 1
        },
        {
            name: 'article_photo',
            maxCount: 1
        }
    ]);
    app.post('/ask_article', article_upload, function (req, res, next) {
        //console.log(req.files)
        console.log('ask art inside')

        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Your post failed, please update your profile first"
            });
        } else {

            var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
            var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
            var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
            var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');

            var owner_details = {
                id: res_id,
                displayName: display_name,
                displayPic: displayPic,
                status: status
            };

            let write_art = new article();
            write_art.post_type = "article";
            write_art.access = 1; //default :public access
            write_art.body = (req.body.article_title);
            // write_art.body = convertToSentencCase(req.body.article_title);
            write_art.topic = (req.body.article_topic);
            // write_art.topic = convertToSentencCase(req.body.article_topic);
            write_art.category = req.body.article_category;
            write_art.sub_cat1 = req.body.article_sub1;
            write_art.sub_cat2 = req.body.article_sub2;
            write_art.description = req.body.article_info;
            write_art.owner = owner_details;
            write_art.shared_body = striptags(req.body.article_title);
            write_art.shared_description = striptags(req.body.article_info);

            //store attachment if it exists
            if (req.files && req.files['article_attachment']) {
                console.log('filename ' + req.files['article_attachment'][0].filename)
                write_art.attachment.push('uploads/' + req.files['article_attachment'][0].filename);
            }

            //store photo if it exists
            if (req.files && req.files['article_photo']) {
                console.log('filename ' + req.files['article_photo'][0].filename)
                write_art.pics.push('uploads/' + req.files['article_photo'][0].filename);
            }


            write_art.save(function (err1, saved_art) {

                if (err1) {
                    console.log(err1);
                    res.json({
                        success: false,
                        msg: "Article submission failed"
                    });

                } else if (saved_art) {
                    //send notification
                    var notifiers = req.user.friends;
                    if (notifiers.length > 0) {
                        var notif_type = "new_post";
                        var section_name = "article";
                        var section_id = saved_art._id;
                        var section_resp_id = "";
                        var section_pic = req.user.displayPic[0];
                        var url = process.env.URL_ROOT + "/posts/section/" + section_name + "/all_responses/" + saved_art._id;
                        var msg = req.user.displayName + " posted a question";
                        var curr_user_id = req.user._id;

                        process_notifs.saveNotifs(notifiers, notif_type, section_id, section_name, section_resp_id, section_pic, url, msg, curr_user_id, function (items_notifs) {
                            //console.log('RECEIVE NOTIFS '+items_notifs)
                            if (items_notifs) {
                                //update user's article_ids
                                user.findOne({
                                    _id: req.user._id
                                }, function (uerr, udata) {
                                    if (udata) {

                                        let updateUser = udata;
                                        updateUser.article_ids.push(saved_art._id);
                                        updateUser.article_ids = updateUser.article_ids.filter(onlyUnique); //remove duplicate entries

                                        user.updateOne({
                                            _id: req.user._id
                                        }, {
                                            $set: updateUser
                                        }, function (err2, res2) {

                                            if (err2) {
                                                console.log("Unable to update user's articles")
                                            } else if (res2) {
                                                // console.log("updated user's articles")  

                                                var page_results = [];
                                                //console.log(saved_art);
                                                page_results.push(saved_art);

                                                process_posts.processPagePosts(page_results, req.user, function (processed_response) {
                                                    //console.log('JSON PROCESSED RESPONSE');
                                                    //console.log(processed_response);
                                                    var json = JSON.stringify(processed_response[0], null, 2);

                                                    // console.log(json);//update feeds,all questions & unanswered quests
                                                    console.log('emitting...')
                                                    io.emit('new_articles', json);
                                                    res.json({
                                                        success: true,
                                                        msg: "Article submission succesful"
                                                    });

                                                });
                                            }

                                        });

                                    } else {
                                        res.json({
                                            success: false,
                                            msg: "user profile not found"
                                        });
                                    }

                                });
                            } 



                        });
                    }else {
                        res.json({
                            success: true,
                            msg: "Article submission succesful"
                        });
                    }


                }
            });

        }

    });

    /*process an 'ask a riddle' post,save & update UI immediately*/
app.post('/ask_riddle', upload.single('riddle_photo'), function (req, res, next) {
    // console.log('req.fil')
    console.log(req.file)

    if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
        console.log("user has not updated profile")
        res.json({
            success: false,
            msg: "Your post failed, please update your profile first"
        });
    } else {
        var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
        var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
        var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
        var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');

        var owner_details = {
            id: res_id,
            displayName: display_name,
            displayPic: displayPic,
            status: status
        };

        let ask_riddle = new riddle();
        ask_riddle.post_type = "riddle";
        ask_riddle.access = 1; //default :public access
        ask_riddle.body = (req.body.riddle_title);
        ask_riddle.category = req.body.riddle_category;
        ask_riddle.sub_cat1 = req.body.riddle_sub1;
        ask_riddle.sub_cat2 = req.body.riddle_sub2;
        ask_riddle.owner = owner_details;
        ask_riddle.shared_body = striptags(req.body.riddle_title);
        ask_riddle.shared_description = striptags(req.body.riddle_title);

        if (req.file && req.file.filename != null) {
            ask_riddle.pics.push('uploads/' + req.file.filename);
        }

        ask_riddle.save(function (err1, saved_ridd) {

            if (err1) {
                console.log(err1);
                res.json({
                    success: false,
                    msg: "Riddle submission failed"
                });

            } else {

                //send notification
                var notifiers = req.user.friends;
                var notif_type = "new_post";
                var section_name = "riddle";
                var section_id = saved_ridd._id;
                var section_resp_id = "";
                var section_pic = req.user.displayPic[0];
                var url = process.env.URL_ROOT + "/posts/section/" + section_name + "/all_responses/" + saved_ridd._id;
                var msg = req.user.displayName + " posted a " + section_name;
                var curr_user_id = req.user._id;

                process_notifs.saveNotifs(notifiers, notif_type, section_id, section_name, section_resp_id, section_pic, url, msg, curr_user_id, function (items_notifs) {

                    if (items_notifs) {
                        //update user's riddle_ids
                        user.findOne({
                            _id: req.user._id
                        }, function (uerr, udata) {
                            if (udata) {

                                let updateUser = udata;
                                updateUser.riddle_ids.push(saved_ridd._id);
                                updateUser.riddle_ids = updateUser.riddle_ids.filter(onlyUnique); //remove duplicate entries

                                user.updateOne({
                                    _id: req.user._id
                                }, {
                                    $set: updateUser
                                }, function (err2, res2) {

                                    if (err2) {
                                        console.log("Unable to update user's riddles")
                                    } else if (res2) {
                                        var page_results = [];
                                        //console.log(saved_ridd);
                                        page_results.push(saved_ridd);

                                        process_posts.processPagePosts(page_results, req.user, function (processed_response) {
                                            //console.log('JSON PROCESSED RESPONSE');
                                            //console.log(processed_response);
                                            var json = JSON.stringify(processed_response[0], null, 2);

                                            console.log('emitting riddles...')
                                            io.emit('new_riddles', json);
                                            res.json({
                                                success: true,
                                                msg: "Riddle submission succesful"
                                            });

                                        });
                                    }

                                });

                            } else {
                                res.json({
                                    success: false,
                                    msg: "user profile not found"
                                });
                            }

                        });
                    }

                });

            }
        });

    }

});


    /*process a request post,save*/
    var request_upload = upload.fields([
        // {name: 'request_attachment',maxCount:1 },
        {
            name: 'request_photo',
            maxCount: 1
        }
    ]);
    app.post('/make_request', request_upload, function (req, res, next) {

        var request_type = req.body.request_type;
        console.log('request_type ' + request_type);

        if ((req.body.request_choice) && (req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("request failed or user has not updated profile")
            res.json({
                success: false,
                msg: "Your request failed"
            });
        } else {

            var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
            var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
            var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
            var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');


            var owner_details = {
                id: res_id,
                displayName: display_name,
                displayPic: displayPic,
                status: status
            };

            let write_req = new request_model();
            write_req.post_type = "request";
            write_req.access = 1; //default :public access

            if (request_type == "question") {
                write_req.body = (req.body.request_title);
                // write_req.body = convertToSentencCase(req.body.request_title);
                write_req.description = req.body.request_info;
            } else if (request_type == "article") {
                write_req.topic = (req.body.request_topic);
                // write_req.topic = convertToSentencCase(req.body.request_topic);
                write_req.description = (req.body.request_info_article);
                // write_req.description = convertToSentencCase(req.body.request_info_article);
            } else if (request_type == "riddle") {
                write_req.body = (req.body.request_title_riddle);
                // write_req.body = convertToSentencCase(req.body.request_title_riddle);
                write_req.description = (req.body.request_title_riddle);
                // write_req.description = convertToSentencCase(req.body.request_title_riddle);
            }

            write_req.category = req.body.request_category;
            write_req.destination_id = req.body.request_users;
            write_req.sub_cat1 = req.body.request_sub1;
            write_req.sub_cat2 = req.body.request_sub2;
            write_req.destination_id = req.body.request_users;
            write_req.destination_type = req.body.request_choice;
            write_req.shared_body = striptags(req.body.request_title);
            write_req.shared_description = striptags(write_req.description);

            write_req.owner = owner_details;

            //set the appropriate request type
            switch (req.body.request_type) {
                case 'question':
                    write_req.question_status = true;
                    break;

                case 'article':
                    write_req.art_status = true;
                    break;

                case 'riddle':
                    write_req.riddle_status = true;
                    break;
            }


            //store photo if it exists
            if (req.files && req.files['request_photo']) {
                console.log('filename ' + req.files['request_photo'][0].filename)
                write_req.pics.push('uploads/' + req.files['request_photo'][0].filename);
            }


            write_req.save(function (err1, saved_req) {

                if (err1) {
                    console.log(err1);
                    res.json({
                        success: false,
                        msg: "Request submission failed"
                    });

                } else {
                    res.json({
                        success: true,
                        msg: "Request submission succesful"
                    });
                }
            });

        }

    });


    /*process a new request*/
    var request_upload = upload.fields([
        // {name: 'request_attachment',maxCount:1 },
        //{name: 'new_request_photo',maxCount:1 }
    ]);
    app.post('/make_new_request', request_upload, function (req, res, next) {

        //console.log('request '+req);
        var request_type = req.body.new_request_type;
        console.log('request_type ' + request_type);

        var request_id = req.body.new_request_id;
        console.log('request_id ' + request_id);

        if ((req.body.new_request_choice) && (req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("request failed or user has not updated profile")
            res.json({
                success: false,
                msg: "Your request failed"
            });
        } else {

            var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
            var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
            var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
            var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');


            var owner_details = {
                id: res_id,
                displayName: display_name,
                displayPic: displayPic,
                status: status
            };
            var section;

            switch (request_type) {
                case 'question':
                    section = question;
                    break;

                case 'article':
                    section = article;
                    break;

                case 'riddle':
                    section = riddle;
                    break;

                case 'pab':
                    section = pab;
                    break;

            }

            //get question & insert into request
            section.findOne({
                _id: request_id
            }, function (error, result) {
                if (result) {
                    let section_data = result;

                    let write_req = new request_model();
                    write_req.post_type = "request";
                    write_req.access = 1; //default :public access

                    if (request_type == "question") {
                        write_req.body = section_data.body;
                        write_req.description = section_data.description;
                    } else if (request_type == "article") {
                        write_req.topic = (req.body.new_request_topic);
                        write_req.description = (req.body.new_request_info_article);
                    } else if (request_type == "riddle") {
                        write_req.body = (req.body.new_request_title_riddle);
                        write_req.description = (req.body.new_request_title_riddle);
                    }

                    write_req.destination_id = req.body.new_request_users;
                    write_req.destination_type = req.body.new_request_choice;
                    write_req.category = section_data.category;
                    write_req.sub_cat1 = section_data.sub_cat1;
                    write_req.sub_cat2 = section_data.sub_cat2;
                    write_req.pics = section_data.pics;
                    write_req.date_created = new Date();;
                    write_req.sub_cat2 = section_data.sub_cat2;
                    write_req.shared_body = striptags(write_req.body);
                    write_req.shared_description = striptags(write_req.description);

                    write_req.owner = owner_details;
                    //set the appropriate new_request type
                    switch (request_type) {
                        case 'question':
                            write_req.question_status = true;
                            break;

                        case 'article':
                            write_req.art_status = true;
                            break;

                        case 'riddle':
                            write_req.riddle_status = true;
                            break;
                    }

                    write_req.save(function (err1, saved_req) {

                        if (err1) {
                            console.log(err1);
                            res.json({
                                success: false,
                                msg: "Request submission failed"
                            });

                        } else {
                            res.json({
                                success: true,
                                msg: "Request submission succesful"
                            });
                        }
                    });

                } else {
                    res.json({
                        success: false,
                        msg: "Item not found for this request"
                    });
                }
            });

        }

    });

    /*process an 'write a notice' post,save & update UI immediately*/
    var notice_upload = upload.fields([{
        name: 'notice_photo',
        maxCount: 1
    }]);
    app.post('/ask_notice', notice_upload, function (req, res, next) {
        console.log(req.files)

        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Your post failed, please update your profile first"
            });
        } else {

            var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
            var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
            var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
            var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');

            var owner_details = {
                id: res_id,
                displayName: display_name,
                displayPic: displayPic,
                status: status
            };

            let write_notice = new notice();
            write_notice.post_type = "notice board";
            write_notice.access = 1; //default :public access
            write_notice.body = (req.body.notice_title);
            // write_notice.body = convertToSentencCase(req.body.notice_title);
            write_notice.category = req.body.notice_top_heading;
            write_notice.sub_cat1 = req.body.notice_main_heading;
            write_notice.sub_cat2 = req.body.notice_type;
            write_notice.owner = owner_details;
            write_notice.shared_body = striptags(req.body.notice_title);
            write_notice.shared_description = striptags(req.body.notice_title);

            //store photo if it exists
            if (req.files && req.files['notice_photo']) {
                console.log('filename ' + req.files['notice_photo'][0].filename)
                write_notice.pics.push('uploads/' + req.files['notice_photo'][0].filename);
            }

            write_notice.save(function (err1, saved_notice) {

                if (err1) {
                    console.log(err1);
                    res.json({
                        success: false,
                        msg: "notice submission failed"
                    });

                } else {
                    console.log(saved_notice)

                    //send notification
                    var notifiers = req.user.friends;
                    var notif_type = "new_post";
                    var section_name = "notice";
                    var section_id = saved_notice._id;
                    var section_resp_id = "";
                    var section_pic = req.user.displayPic[0];
                    var url = process.env.URL_ROOT + "/posts/section/" + section_name + "/all_responses/" + saved_notice._id;
                    var msg = req.user.displayName + " posted a " + section_name;
                    var curr_user_id = req.user._id;

                    process_notifs.saveNotifs(notifiers, notif_type, section_id, section_name, section_resp_id, section_pic, url, msg, curr_user_id, function (items_notifs) {

                        // var json = JSON.stringify(saved_notice, null, 2);
                        // io.emit('new_notices', json);
                        // res.json({success:true,msg:"Notice submission succesful"});

                        var page_results = [];
                        page_results.push(saved_notice);

                        process_posts.processPagePosts(page_results, req.user, function (processed_response) {
                            console.log('JSON PROCESSED RESPONSE');
                            var json = JSON.stringify(processed_response[0], null, 2);
                            console.log('emitting notices...')
                            io.emit('new_notices', json);
                            res.json({
                                success: true,
                                msg: "Notice submission succesful"
                            });

                        });

                    });

                }
            });

        }

    });

    /*process  notice modifications & edits immediately*/
    var notice_update_upload = upload.fields([{
        name: 'notice_update_photo',
        maxCount: 1
    }]);
    app.post('/update_notice', notice_update_upload, function (req, res, next) {
        // console.log(req.user)

        var section_id = req.body.notice_update_id;

        notice.findOne({
            _id: section_id
        }, function (error, result) { //find the notice that was responsed
            if (result) {
                var displayPic = (req.user.displayPic) ? (req.user.displayPic[req.user.displayPic.length - 1]) : ('uploads/avatar.png');
                var status = (req.user.designation[0]) ? ((req.user.designation[req.user.designation.length - 1]).title) : ('');
                var display_name = (req.user.displayName) ? (req.user.displayName) : ('');
                var res_id = (req.user._id) ? ((req.user._id).toString()) : ('');

                var owner_details = {
                    id: res_id,
                    displayName: display_name,
                    displayPic: displayPic,
                    status: status
                };

                let updateSection = result;
                updateSection.date_modified = new Date();
                updateSection.category = req.body.notice_update_top_heading;
                updateSection.sub_cat1 = req.body.notice_update_main_heading;
                updateSection.sub_cat2 = req.body.notice_update_type;
                updateSection.owner = owner_details;
                updateSection.body = convertToSentencCase(req.body.notice_update_title);
                updateSection.shared_body = striptags(req.body.notice_update_title);
                updateSection.shared_description = striptags(req.body.notice_update_title);

                //store photo if it exists::delete prev
                if (req.files && req.files['notice_update_photo']) {
                    //delete prev photo
                    if (updateSection.pics && updateSection.pics[0] != null) {
                        var filename = updateSection.pics[0];
                        console.log('found file ref to update ' + updateSection.pics[0]);
                        deleteFile(filename);
                    }

                    console.log('filename ' + req.files['notice_update_photo'][0].filename)
                    updateSection.pics[0] = 'uploads/' + req.files['notice_update_photo'][0].filename;
                }

                // let most_recent_response={
                //     _id:section_id,
                //     body : updateSection.body,
                //     category:updateSection.category,
                //     sub_cat1:updateSection.sub_cat1,
                //     sub_cat2:updateSection.sub_cat2,
                //     description:updateSection.description,
                //     date_modified:updateSection.date_modified
                // }


                section.updateOne({
                    _id: section_id
                }, {
                    $set: updateSection
                }, function (err1, res1) {

                    if (err1) {
                        console.log(err1)
                        res.json({
                            success: false,
                            msg: "Your update failed"
                        });
                    } else if (res1) {
                        //var json = JSON.stringify(most_recent_response, null, 2);
                        // console.log(json);
                        // io.emit('responded', json);
                        res.json({
                            success: true,
                            msg: "Your update was successfull"
                        });
                    }

                });
            } else {
                res.json({
                    success: false,
                    msg: "Item not found"
                });
            }

        });


    });

    /*END POSTS*/
    //------------------------------------------
    app.get('/fetchCats', isLoggedIn, function (req, res) {
        console.log(req.query);
        var section = req.query.section,
            cat;

        switch (section) {
            case 'question':
                cat = quest_cat;
                break;

            case 'article':
                cat = art_cat;
                break;

            case 'riddle':
                cat = riddle_cat;
                break;

            case 'Post Books':
            case 'pab':
                cat = pab_cat;
                break;
        }

        cat.find().sort({
            value: 1
        }).exec(function (err1, res1) {
            var res_cat = [];

            if (err1) {
                console.log(err1);

                res.json({
                    success: false,
                    msg: "Fetched categories failed",
                    cats: res_cat
                });
            } else if (res1) {
                res_cat = res1;

                res.json({
                    success: true,
                    msg: "Fetched categories successfully",
                    cats: res_cat
                });
            }

        });
    });

    app.get('/profile/:id', isLoggedIn, function (req, res) {
        var user_id = req.params.id;
        console.log('user id ' + user_id);
        var isOwner = false;

        user.findOne({
            _id: user_id
        }, function (err, u) {
            if (u) {
                let found_user = u;

                var qualification = "",
                    designation = "",
                    dob = "",
                    age = "",
                    displayPic = "uploads/avatar.png",
                    backgroundPic = "";

                if (user_id == (req.user._id).toString())
                    isOwner = true;

                if (found_user.qualification[0]) {
                    qualification = found_user.qualification[found_user.qualification.length - 1].title;
                }
                console.log('qualification : ' + qualification)

                if (found_user.designation[0]) {
                    designation = found_user.designation[found_user.designation.length - 1].title;
                }
                console.log('designation : ' + designation);

                if (found_user.dob) {
                    dob = moment(found_user.dob).format('MM/DD/YYYY');
                    age = moment().diff(new Date(found_user.dob), 'years');
                }
                console.log('dob : ' + dob);
                console.log('age : ' + age);

                if (found_user.displayPic[0]) {
                    displayPic = found_user.displayPic[found_user.displayPic.length - 1];
                }
                console.log('displayPic : ' + displayPic);

                if (found_user.backgroundPic[0]) {
                    backgroundPic = found_user.backgroundPic[found_user.backgroundPic.length - 1];
                }
                console.log('backgroundPic : ' + backgroundPic);


                res.render('profile', {
                    url: process.env.URL_ROOT,
                    user_info: found_user,
                    isOwner: isOwner,
                    dob: dob,
                    age: age,
                    displayPic: displayPic,
                    qualification: qualification,
                    designation: designation,
                    backgroundPic: backgroundPic,
                    friends_count: found_user.friends.length,
                    followers_count: found_user.followers.length,
                    followed_count: found_user.followed.length,
                    bookmarks_count: found_user.bookmarks.length,
                    requests_count: found_user.request_ids.length,
                    questions_count: found_user.question_ids.length,
                    answers_count: found_user.answer_ids.length,
                    articles_count: found_user.article_ids.length,
                    reviews_count: found_user.review_ids.length,
                    riddles_count: found_user.riddle_ids.length,
                    solutions_count: found_user.solution_ids.length,
                    postedbooks_count: found_user.postedbook_ids.length,
                    groups_count: found_user.group_ids.length
                });

            } else {
                res.redirect('/');
            }

        });


    });

    /*
fetch users
*/
    app.get('/fetchUsers', isLoggedIn, function (req, res) {
        user.find({
            $and: [{
                    _id: {
                        $ne: req.user._id
                    }
                },
                {
                    displayName: {
                        $ne: "User"
                    }
                },
                {
                    level: req.query.item
                }
            ]
        }, {
            _id: 1,
            displayName: 1
        }).exec(function (err1, res1) {
            var res_subcat = [];

            if (err1) {
                console.log(err1);

                res.json({
                    success: false,
                    msg: "Fetched users failed",
                    cats: res_subcat
                });
            } else if (res1) {
                console.log(res1);
                res_subcat = res1;

                res.json({
                    success: true,
                    msg: "Fetched users successfully",
                    cats: res_subcat
                });
            }

        });
    });

    /*
    fetch sub cat1s for a category
    */
    app.get('/fetchSubCats1', isLoggedIn, function (req, res) {
        console.log(req.query);
        var section_type = req.query.section,
            category = req.query.item,
            section;

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

            case 'request':
                section = request_model;
                break;
        }

        section.find({
            category: category
        }, {
            sub_cat1: 1
        }).exec(function (err1, res1) {
            var res_subcat = [];

            if (err1) {
                console.log(err1);

                res.json({
                    success: false,
                    msg: "Fetched sub categories failed",
                    cats: res_subcat
                });
            } else if (res1) {
                console.log(res1);
                res_subcat = res1;

                res.json({
                    success: true,
                    msg: "Fetched sub categories successfully",
                    cats: res_subcat
                });
            }

        });
    });
    /*

    fetch sub cat2s for a category
    */
    app.get('/fetchSubCats2', isLoggedIn, function (req, res) {
        console.log(req.query);
        var section_type = req.query.section,
            cat1 = req.query.item,
            section;

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

            case 'request':
                section = request_model;
                break;
        }

        section.find({
            sub_cat1: cat1
        }, {
            sub_cat2: 1
        }).exec(function (err1, res1) {
            var res_subcat = [];

            if (err1) {
                console.log(err1);

                res.json({
                    success: false,
                    msg: "Fetched sub categories2 failed",
                    cats: res_subcat
                });
            } else if (res1) {
                console.log(res1);
                res_subcat = res1;

                res.json({
                    success: true,
                    msg: "Fetched sub categories2 successfully",
                    cats: res_subcat
                });
            }

        });
    });

    /*
fetch rows from selected section of user,
sort them by date_created
*/
    app.get('/myfeeds/:section', isLoggedIn, function (req, res) {
        var item = req.params.section;
        //page defaults
        var skip_val = 0,
            req_count = 0,
            limit_val = 5,
            page = 'feeds',
            page_title = '',
            page_results = [],
            res_item_trend = [],
            res_item_experts = [];

        //get trending stories for sidebar headlines
        trend.find().sort({
            date_created: 1
        }).limit(limit_val).exec(function (err_trend, item_trend) {

            if (err_trend) {
                //console.log(err_trend);
            }
            if (item_trend) {
                res_item_trend = item_trend;
            }

            //get experts
            user.find({
                level: 'expert'
            }).sort({
                date_created: 1
            }).exec(function (err_expert, item_expert) {

                if (err_expert) {
                    //console.log(err_trend);
                }
                if (item_expert) {
                    res_item_experts = item_expert;
                }

                //get total requests for this user
                var id_string = (req.user._id).toString();
                request_model.find({
                    $or: [{
                        destination_id: id_string
                    }, {
                        "owner.id": id_string
                    }]
                }).exec(function (err1, res1) {
                    req_count = res1.length;

                    var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                    if (req.user.displayPic[0]) {
                        curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                    } //end display

                    var bookmark_len = req.user.bookmarks.length; //get saved bookmarks

                    //find pending notifications length
                    var notifs_count = 0;
                    process_posts.getNotifications(req.user, function (rel_notifs) {
                        notifs_count = rel_notifs;

                        var pending_friend_notifs = 0;
                        process_posts.getPendingFriendsCount(req.user, function (rel_notifs) {
                            pending_friend_notifs = rel_notifs;

                            switch (item) {
                                case 'question':
                                    section = question;
                                    break;

                                case 'article':
                                    section = article;
                                    break;

                                case 'riddle':
                                    section = riddle;
                                    break;

                                case 'pab':
                                case 'Post Books':
                                    section = pab;
                                    page_title = 'Post Books';
                                    break;
                            }

                            section.find({
                                "owner.id": req.user._id
                            }).sort({
                                post_date: -1
                            }).exec(function (err, items) {

                                // var res_items=[];
                                var curr_user_display_pic = 'uploads/avatar.png'; //set default pic
                                if (req.user.displayPic[0]) {
                                    curr_user_display_pic = req.user.displayPic[req.user.displayPic.length - 1];
                                }

                                if (err) {
                                    console.log(err);
                                } else if (items) {
                                    //items were found

                                    if (items.length > 0) {

                                        process_posts.processPagePosts(items, req.user, function (processed_response) {

                                            // console.log('processed_response '+processed_response)
                                            res.render(page, {
                                                url: process.env.URL_ROOT,
                                                displayPic: curr_user_display_pic,
                                                user_info: req.user,
                                                data: processed_response,
                                                data_trend: res_item_trend,
                                                data_experts: res_item_experts,
                                                page_title: page_title,
                                                class_type: 'dashboard_page',
                                                pending_friend_notifs: pending_friend_notifs,
                                                req_count: req_count,
                                                notifs_count: notifs_count,
                                                bookmarks_count: bookmark_len,

                                                quest_page_status: false,
                                                art_page_status: false,
                                                riddle_page_status: false,
                                                notice_page_status: false,
                                                pab_page_status: false,
                                                request_page_status: false,
                                                trend_page_status: false,
                                                home_page_status: true
                                            });

                                        });
                                    } else {
                                        res.render(page, {
                                            url: process.env.URL_ROOT,
                                            displayPic: curr_user_display_pic,
                                            user_info: req.user,
                                            data: page_results,
                                            data_trend: res_item_trend,
                                            data_experts: res_item_experts,
                                            page_title: page_title,
                                            class_type: 'dashboard_page',
                                            pending_friend_notifs: pending_friend_notifs,
                                            req_count: req_count,
                                            bookmarks_count: bookmark_len,
                                            notifs_count: notifs_count,

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
                                }

                            }); //end section

                        }); //end notifications

                    }); //end pending friend count

                }); //end request

            }); //end experts


        }); //end trend


    });

    /*updates bio1*/
    var profile_upload = upload.fields([{
            name: 'profile_bio1_displayPic',
            maxCount: 1
        },
        {
            name: 'profile_bio1_backgroundPic',
            maxCount: 1
        }
    ]);

    app.post('/update_bio1', profile_upload, function (req, res, next) {

        // console.log(req.body);

        var dob = moment(req.body.profile_bio1_dob, 'MM/DD/YYYY');
        //console.log(dob);

        designation_updates = {
            title: req.body.profile_bio1_designation,
            body: ''
        }

        user.findOne({
            email: req.user.email
        }, function (err, u) {
            if (u) {
                let updateUser = u;
                updateUser.firstname = req.body.profile_bio1_firstname;
                updateUser.lastname = req.body.profile_bio1_lastname;
                updateUser.location = req.body.profile_bio1_location;
                updateUser.dob = dob;
                updateUser.displayName = updateUser.firstname + ' ' + updateUser.lastname;
                updateUser.date_modified = new Date();
                updateUser.designation = designation_updates;

                //store img if it exists
                if (req.files && req.files['profile_bio1_displayPic']) {
                    // console.log('filename ' + req.files['profile_bio1_displayPic'][0].filename)
                    updateUser.displayPic.push('uploads/' + req.files['profile_bio1_displayPic'][0].filename);
                }

                if (req.files && req.files['profile_bio1_backgroundPic']) {
                    // console.log('filename ' + req.files['profile_bio1_backgroundPic'][0].filename)
                    updateUser.backgroundPic.push('uploads/' + req.files['profile_bio1_backgroundPic'][0].filename);
                }
                // console.log(updateUser);
                //$currentDate:{date_modified:true},
                user.updateOne({
                    email: req.user.email
                }, {
                    $set: updateUser
                }, function (err1, res1) {

                    if (err1) {
                        console.log(err1)
                        res.json({
                            success: false,
                            msg: "Your profile update failed"
                        });
                    } else if (res1) {
                        res.json({
                            success: true,
                            msg: "Your profile update was successfull"
                        });
                    }

                });
            }

        });

    });

    //-------------------
    //FRIENDS
    //-------------------

    /*sends a friend request to the owner of the post*/
    app.get('/sendFriendRequest', isLoggedIn, function (req, res) {
        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Update your profile first"
            });
        } else {

            console.log('sending friend request');
            var owner_id = req.query.owner_id;
            console.log('received owner_id' + owner_id);
            var curr_user = req.user;
            // console.log('curr user '+ curr_user);
            //curr user sends request to owner
            curr_user.friendRequest(owner_id, function (err, request) {
                if (err) console.log(err);
                console.log('request', request);
                if (request) {
                    res.json({
                        success: true,
                        msg: "Friend Request Sent"
                    });
                    //send notification to requested
                    //     var new_friend_notif_obj={
                    //         source_id:curr_user._id,
                    //         source_name:curr_user.displayName,
                    //         source_pic:curr_user.displayPic,
                    //         destination_id:owner_id,
                    //         status:'Pending',
                    //         notif_type:'friends',
                    //         message:curr_user.displayName+' sent you a friend request'
                    //     }
                    //     notifs.post('friends_new',new_friend_notif_obj,{language:'en'});
                    //     //update requested's notifications db
                    //     user.findOne({_id:owner_id}, function(err1, user_owner) {
                    //         if(user_owner){
                    //             let updateRequested=user_owner;

                    //         updateRequested.notifications.push(new_friend_notif_obj);//append notification items
                    //         updateRequested.date_modified=new Date();//update date
                    //         console.log(updateRequested);

                    //         user.updateOne({_id:owner_id},{$set:updateRequested},function(err2,res2){
                    //             if(err2){
                    //                 console.log(err2);
                    //                 res.json({success:false,msg:"Friend Request Failed"});
                    //             }
                    //             else if(res2){
                    //                 res.json({success:true,msg:"Friend Request Sent"});
                    //             }
                    //         });

                    //     }

                    // });
                }
            });

        }

    });

    /*gets friend requests for the current user*/
    app.get('/getFriendRequests', isLoggedIn, function (req, res) {
        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Update your profile first"
            });
        } else {
            var notif_res = [];
            var page = 'friend_request';
            var page_title = '';
            var curr_user = req.user;
            console.log(curr_user._id)

            //get pending friends
            curr_user.getPendingFriends(curr_user._id, function (err, pending) {
                if (err) {
                    console.log('err occured geting pending friends');
                    console.log(err)
                }
                if (pending) {
                    console.log(pending);
                    var len = pending.length;
                    var new_friend_notif_obj;
                    var curr_pending;
                    for (var i = 0; i < len; i++) {
                        curr_pending = pending[i];

                        new_friend_notif_obj = {
                            source_id: curr_pending._id,
                            source_name: curr_pending.displayName,
                            source_pic: curr_pending.displayPic[0],
                            destination_id: curr_user._id,
                            status: 'Pending',
                            notif_type: 'friends',
                            message: curr_pending.displayName + ' sent you a friend request'
                        }
                        notif_res.push(new_friend_notif_obj);

                    }
                    console.log('notif_res');
                    console.log(notif_res);
                }

            });

            res.render(page, {
                url: process.env.URL_ROOT,
                displayPic: req.user.displayPic,
                user_info: req.user,
                data: notif_res,
                // data_trend:res_item_trend,
                page_title: page_title,
                // pending_friend_notifs:pending_friend_notifs,

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

    app.get('/acceptFriendRequest', isLoggedIn, function (req, res) {

        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Update your profile first"
            });
        } else {
            //console.log('accepting friend request');
            var source_id = req.query.source_id;
            //console.log('accept source_id '+source_id);
            var curr_user = req.user;

            //accept the friendship
            curr_user.acceptRequest(source_id, function (err, friendship) {
                if (err) {
                    console.log(err);
                    res.json({
                        success: false,
                        msg: "Friendship processing failed"
                    });
                }

                if (friendship) {
                    console.log('friendship', friendship);

                    //send notification
                    var notifiers = [source_id];
                    var notif_type = "accept_friend_request";
                    var section_name = "";
                    var section_id = "";
                    var section_resp_id = "";
                    var section_pic = req.user.displayPic[0];
                    var url = process.env.URL_ROOT + "/profile/" + curr_user._id;
                    var msg = req.user.displayName + " accepted your friend request";
                    var curr_user_id = curr_user._id;

                    process_notifs.saveNotifs(notifiers, notif_type, section_id, section_name, section_resp_id, section_pic, url, msg, curr_user_id, function (items_notifs) {
                        console.log('RECEIVE NOTIFS ' + items_notifs)

                        //update friend list for both friends
                        user.findOne({
                            _id: curr_user._id
                        }, function (err_user1, user1) {
                            if (err_user1) console.log(err_user1);

                            if (user1) {
                                user1.friends.push(source_id);
                                user1.friends = user1.friends.filter(onlyUnique);
                                user.update({
                                    _id: curr_user._id
                                }, {
                                    $set: user1
                                }, function (err_update, update) {
                                    if (err_update) {
                                        console.log(err_update);
                                    } else if (update) {
                                        console.log('friendship for user1 updated');
                                    }

                                });
                            }

                        });

                        user.findOne({
                            _id: source_id
                        }, function (err_user2, user2) {
                            if (err_user2) console.log(err_user2);

                            if (user2) {
                                user2.friends.push(curr_user._id);
                                user2.friends = user2.friends.filter(onlyUnique)
                                user.update({
                                    _id: source_id
                                }, {
                                    $set: user2
                                }, function (err_update2, update2) {
                                    if (err_update2) {
                                        console.log(err_update2);
                                    } else if (update2) {
                                        console.log('friendship for user2 updated');

                                        //send notification if user is online
                                        //chk if user is currently connected
                                        curr_user_string = (curr_user._id).toString();
                                        // activeConn.findOne({clientId:curr_user_string},function(err_active,actives){
                                        //     if(err_active)console.log(err_active)
                                        //     if(actives)
                                        // })

                                        // activeConn.find({clientId:curr_user_string}).sort({date_created:-1}).exec(function(err_active,actives){
                                        //     if(err_active)console.log(err_active)
                                        //     if(actives){
                                        //         //send notif
                                        //         var curr_socketId=mongoose.Types.ObjectId(actives.socketId)
                                        //         console.log('socket id '+curr_socketId);
                                        //         io.sockets.connected[curr_socketId].emit( 'update_notification_count', {
                                        //             new_count: 1
                                        //         });
                                        //     }

                                        // });

                                    }

                                });
                            }

                        });
                    });
                    res.json({
                        success: true,
                        msg: "You accepted a friendship"
                    });
                }
            });
        }
    });

    app.get('/rejectFriendRequest', isLoggedIn, function (req, res) {

        if ((req.user.displayPic).length === 0 || req.user.displayName == "User" || req.user.displayName == "") {
            console.log("user has not updated profile")
            res.json({
                success: false,
                msg: "Update your profile first"
            });
        } else {
            console.log('rejecting friend request');
            var source_id = req.query.source_id;
            console.log('rejected source_id' + source_id);
            var curr_user = req.user;

            //accept the friendship
            curr_user.denyRequest(source_id, function (err, denied) {
                if (err) {
                    console.log(err);
                    res.json({
                        success: false,
                        msg: "Friendship rejection processing failed"
                    });
                }

                if (denied) {
                    console.log('friendship', denied)
                    res.json({
                        success: true,
                        msg: "You rejected a friendship"
                    });
                }
            })
        }
    });



    //no routes found ==================
    app.get('*', function (req, res) {
        res.render('404', {});
    });

    function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) return next()
        // if they aren't redirect them to the home page
        console.log('user not authenticated')
        res.redirect('/')
    }

    // function convertToSentencCase(text_data) {
    //     console.log('text_data ' + text_data);
    //     var n = text_data.split(".");
    //     var vfinal = "";

    //     for (i = 0; i < n.length; i++) {
    //         var spaceput = "";
    //         var space_count = n[i].replace(/^(\s*).*$/, "$1").length;
    //         n[i] = n[i].replace(/^\s+/, "");
    //         var newstring = n[i].charAt(n[i]).toUpperCase() + n[i].slice(1);

    //         for (j = 0; j < space_count; j++)
    //             spaceput = spaceput + " ";
    //         vfinal = vfinal + spaceput + newstring + ".";
    //     }
    //     vfinal = vfinal.substring(0, vfinal.length - 1);
    //     console.log('output ' + vfinal)
    //     return vfinal;
    // }

    /*removes dupliates from an array*/
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    //for fuzzy searchs
    function escapeRegex(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

}