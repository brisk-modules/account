// base class
var brisk = require("brisk"),
	Parent = brisk.getBaseController("main");

var controller = Parent.extend({
	name: "auth",

	index: function(req, res){
		// ...
		res.end();
	},

	callback: function(req, res){

		var service = req.query.service;
		var passport = req.site.helpers.passport.self();
		var db = req.site.models.user;

		passport.authenticate(service, function(err, user, options) {
			if (err) { return console.log(err) }
			// if failed, redirect...
			if (!user) { return res.redirect('/account/login') }
			// fallback
			options = options || {};
			// if an additional account - add to the existing service
			if( options.action ){

				if( options.action == "create" ){
					// include common id
					user.cid = db.createCID(); // make this part of .schema() ?
					// first create the user
					db.create(user,
					function( err, result ) {
						if(err) {throw err;}
						// then try to login
						req.logIn(user, function(err) {
							if (err) { return next(err); }
							return res.redirect('/');
						});
					});

				} else {
					// update just the account information
					var data = {
						id: user.id,
						accounts: user.accounts
					}
					data.accounts[service] = user.accounts[service];
					// update db
					db.update(data,
						function( err, result ) {
							if(err) {throw err;}
							// then try to login
							req.logIn(user, function(err) {
								if (err) { return next(err); }
								return res.redirect('/');
							});
					});
				}

			} else {
				// if not logged in try to login with the db account
				if( typeof req.user == "undefined" ){
					req.logIn(user, function(err) {
						if (err) { return next(err); }
						return res.redirect('/');
					});
				} else {
					// already logged in and no new information...
					return res.redirect('/');
				}
			}

		})
		(req, res, function(error){
			// on error display this
			//console.log(error);
		});

	},

	twitter: function(req, res){

		var passport = req.site.helpers.passport.self();
		passport.authenticate('twitter')(req, res, function(error){
			//console.log(error);
		});
	},

	facebook: function(req, res){

		var passport = req.site.helpers.passport.self();
		passport.authenticate('facebook')(req, res, function(error){
			//console.log(error);
		});
	},

	user: function(req, res){
		var passport = req.site.helpers.passport.self();
		passport.authenticate('local', { successRedirect: '/', failureRedirect: '/account/login' });
	}

});


module.exports = controller;
