module.exports = function (passport,credentials,user) {
    

    var LocalStrategy = require('passport-local').Strategy,
        FacebookStrategy = require('passport-facebook').Strategy,
        LinkedInStrategy = require('passport-linkedin').Strategy,
        GoogleStrategy = require('passport-google-oauth2').Strategy;

    passport.serializeUser(function (user, done) {
        console.log('inside serializeUser')
        //console.log(user);
        done(null, user._id);
    });

    passport.deserializeUser(function (id, done) {
        console.log('inside deserializeUser')

        user.findById(id, function (err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) {
            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                user.findOne({
                    'email': email
                }, function (err, person) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (person) {
                        return done(null, false);
                    } else {
                        // if there is no user with that email
                        // create the user
                        var newUser = new user();
                        newUser.email = email;
                        newUser.password = newUser.generateHash(password);

                        // save the user
                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }

                });

            });

        }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'log_email',
        passwordField: 'log_password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) { // callback with email and password from our form
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            user.findOne({
                'email': email
            }, function (err, person) {
                // if there are any errors, return the error before anything else
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!person)
                    return done(null, false); // req.flash is the way to set flashdata using connect-flash

                // if the user is found but the password is wrong
                if (!person.validPassword(password))
                    return done(null, false); // create the loginMessage and save it to session as flashdata
                console.log('password is VALID')

                // all is well, return successful user
                return done(null, person);
            });

        }));

    // =========================================================================
    // FACEBOOK LOGIN ==========================================================
    // =========================================================================

    passport.use(new FacebookStrategy({
        clientID: credentials.facebook.app_id,
        clientSecret: credentials.facebook.app_secret,
        callbackURL: credentials.facebook.callback,
        profileFields: ['id', 'displayName', 'emails', 'name', 'gender']
    }, function (req, refreshToken, profile, done) {

        var me = new user({
            email: profile.emails[0].value,
            displayName: profile.displayName,
            firstname: profile.name.familyName,
            lastname: profile.name.givenName,
            gender: profile.gender
        });

        /* save if new */
        user.findOne({
            email: me.email
        }, function (err, u) {
            if (!u) {
                //console.log('no existing user so save')
                me.save(function (err, me) {
                    if (err) return done(err);
                    done(null, me);
                });
            } else {
                //console.log('else user was found ');                
                done(null, u);
            }
        });
    }

    ));
    // =========================================================================
    // GOOGLE LOGIN ==========================================================
    // =========================================================================

    passport.use(new GoogleStrategy({
        clientID: credentials.google.clientID,
        clientSecret: credentials.google.clientSecret,
        callbackURL: credentials.google.callback,
        passReqToCallback: true
    },
        function (request, accessToken, refreshToken, profile, done) {

            console.log('passport before google profile')
            console.log(profile);

            var me = new user({
                email: profile.emails[0].value,
                displayName: profile.displayName,
                gender: profile.gender,
                firstname: profile.name.givenName,
                lastname: profile.name.familyName
            });

            /* save if new */
            user.findOne({
                email: me.email
            }, function (err, u) {
                if (!u) {
                    //console.log('google no existing user so save')
                    me.save(function (err, me) {
                        if (err) return done(err);
                        done(null, me);
                    });
                } else {
                    //console.log('else user was found ');                
                    done(null, u);
                }
            });
        }));

    // =========================================================================
    // LINKEDIN LOGIN ==========================================================
    // =========================================================================

    passport.use(new LinkedInStrategy({
        consumerKey: credentials.linkedin.clientID,
        consumerSecret: credentials.linkedin.clientSecret,
        callbackURL: credentials.linkedin.callback,
        scope: ['r_basicprofile', 'r_emailaddress', 'rw_nus'],
        profileFields: ['id', 'first-name', 'last-name', 'email-address', 'public-profile-url']
    },
        function (token, tokenSecret, profile, done) {

            //console.log('passport before linkedin profile')
            //console.log(profile);

            var me = new user({
                email: profile.emails[0].value,
                displayName: profile.displayName,
                gender: '',
                firstname: profile.name.givenName,
                lastname: profile.name.familyName
            });

            /* save if new */
            user.findOne({
                email: me.email
            }, function (err, u) {
                if (!u) {
                    //console.log('linkedin no existing user so save')
                    me.save(function (err, me) {
                        if (err) return done(err);
                        done(null, me);
                    });
                } else {
                    // console.log('else linkedin user was found ');                
                    done(null, u);
                }
            });


        }
    ));
};