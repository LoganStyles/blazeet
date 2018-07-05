module.exports = function (express, app, passport, database) {

    var user = require('../models/user');

    var router = express.Router()

    router.get('/logout', function (req, res) {
        req.logout()
        res.redirect('/')
    });

    router.post('/register', function (req, res, next) {
        passport.authenticate('local-signup', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (!user) {
                return res.json({
                    success: false,
                    msg: "Registration failed,That email is already taken."
                });
            }

            req.login(user, loginErr => {
                if (loginErr) {
                    console.log(loginErr)
                    return next(loginErr);
                }
                // return res.send({ success : true, message : 'authentication succeeded' });//return to browser
                return res.json({
                    success: true,
                    msg: "User registered, please wait..."
                }); //return to ajax
            });
        })(req, res, next);
    });

    router.post('/login', function (req, res, next) {
        passport.authenticate('local-login', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            if (!user) {
                return res.json({
                    success: false,
                    msg: "Login failed: Invalid email/password."
                });
            }

            req.login(user, loginErr => {
                //console.log(req.session)
                if (loginErr) {
                    return next(loginErr);
                }
                // return res.send({ success : true, message : 'authentication succeeded' });//return to browser
                // res.redirect('/authorized')
                return res.json({
                    success: true,
                    msg: "Login successful, please wait..."
                }); //return to ajax
                // res.redirect(process.env.URL_ROOT+'/feeds');
            });
        })(req, res, next);
    });

    router.get('/auth/facebook', passport.authenticate('facebook', {
        scope: "email"
    }));
    router.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/feeds',
        failureRedirect: '/'
    }));

    router.get('/auth/linkedin', passport.authenticate('linkedin'));
    router.get('/auth/linkedin/callback', passport.authenticate('linkedin', {
        successRedirect: '/feeds',
        failureRedirect: '/'
    }));


    router.get('/auth/google', passport.authenticate('google', {
        scope: ['email', 'profile']
    }));
    router.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/feeds',
        failureRedirect: '/'
    }));

    // routes
    app.use('/members', router)

}