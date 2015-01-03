var _ = require('underscore'),
	async = require("async"),
	brisk = require("brisk"),
	bcrypt = require("bcrypt"),
	Parent = brisk.getBaseController("main"),
	Mailer = require("../../index").getHelper("mailer");


var controller = Parent.extend({
	name: "account",

	options: {
		assets: [], // list of models related with users
		private: ["onCreate", "onLogin", "onDelete", "postRegister"] // list of inaccessible methods
	},

	index : function(req, res){

		if( !this.isAuthenticated(req, res) ) return res.redirect('/');
		// variables
		var config = req.site.config;
		//
		res.view = "account";
		// support layouts
		if( config.paths.layouts ) res.options = { layout: 'account' }; // customize with a variable?
		//
		this.render( req, res );

	},

	// login to an existing account
	login : function(req, res){

		// if authenticated redirect to the homepage
		if( this.isAuthenticated(req, res) ) return res.redirect('/');

		switch( req.method ){
			case "GET":

				// save redirect page to session
				req.session._account_login_redirect = ( req.query.redirect ) ? req.query.redirect : "/";

				res.view = "account-login";
				// local vars
				res.locals.useFacebook = this._findAPI("facebook", req.site);
				res.locals.useTwitter = this._findAPI("twitter", req.site);
				//
				this.render( req, res );

			break;
			case "POST":

				var redirect = req.session._account_login_redirect || "/";
				var passport = req.site.helpers.passport.self();

				// process submitted credentials
				passport.authenticate('local', { successRedirect: redirect, failureRedirect: '/account/login', failureFlash: true})(req, res, function(error){
					// on error display this
					console.log("error authenicating: ", error);
				});

				// trigger onLogin event (with latency, replace with throttling?)
				var self = this;
				setTimeout(function(){
					self._onLogin(req, res);
				}, 2000);

			break;
			default:
				// else redirect to the homepage
				return res.redirect('/');
			break;
		}

	},


	// prompt the user to complete the authentication
	complete : function(req, res){

		var self = this;
		// this auth state is a bit peculiar  at this page
		// we accept users that are logged in but have no password
		// get user
		var user = ( typeof req.user != "undefined" ) ? req.user : false;
		// back to login if no user in session
		if( !user ) return res.redirect('/account/login');
		// straight to the dashboard if there is already an email/pass
		if(user && user.password ) return res.redirect('/');

		// supporting flash middleware
		this.alert = alerts( req, res );

		switch( req.method ){
			case "GET":

				// set template vars
				if( !user.email ){
					res.locals.noEmail = true;
				} else {
					res.locals.email = user.email;
				}
				//res.template = "main";
				res.view = "account-complete";
				// render
				this.render( req, res );

			break;
			case "POST":

				var db = req.site.models.user;
				var passport = req.site.helpers.passport.self();
				// (use set() instead)
				var data = req.body;
				data.id = user.id;
				// validate response first...
				var valid = this._validateData( data );
				if( !valid ) return res.redirect('/account/complete');
				// filter data
				delete data.password_confirm;
				// update the existing user model
				//...
				// update password
				data.password = bcrypt.hashSync( data.password, 10 );
				// add date attributes
				data.created = data.updated = (new Date()).getTime(); //is this still needed?
				// include common id
				if( !data.cid ) data.cid = db.createCID(); //is this still needed?

				// update the session (use req.logIn instead?)
				//req.user.email = data.email;
				//req.user.password = data.password;
				var actions = [

					// check if the email is already used
					function( next ){
						db.findOne({ email : data.email }, function( err, user ){
							// error control?
							if( user ) return next({ message: "Email has already been used" })
							next( null );
						});
					},

					// update the database
					function( next ){
						// update the database
						db.update(data, function( err, result ){
							// error control?
							next( null );
						});
					},

					//
					function( next ){
						// send a verification email

						var user = data;
						var mailer = new Mailer( req.site );

						mailer.register({
							name: user.name,
							email: user.email,
							cid: user.cid
						});
						// wait for email delivery?
						next( null );
					},
				];
				// execute
				async.series( actions, function(err, data){
					if( err ){
						// notification
						self.alert("error", err.message);
						return res.redirect('/account/complete');
					} else {
						// success - logout and head back to index
						// notification
						self.alert("success", "Account complete. Check your email for the activation link.");
						req.logOut();
						res.redirect('/');
					}
				});


			break;
			default:
				// else redirect to the homepage
				res.redirect('/');
			break;
		}

	},

	// create user account
	register : function(req, res){

		var self = this;
		// this auth state is a bit peculiar  at this page
		// we accept users that are logged in but have no password
		// get user
		var user = ( typeof req.user != "undefined" ) ? req.user : false;
		// straight to the dashboard if there is already an email/pass
		if(user && user.password ) return res.redirect('/');

		// supporting flash middleware
		this.alert = alerts( req, res );

		switch( req.method ){
			case "GET":

				// check if we want to return to a specific page
				if( req.query.redirect ) {
					// save to session
					req.session._account_login_redirect = req.query.redirect;
				}

				res.view = "account-register";
				// local vars
				res.locals.useFacebook = this._findAPI("facebook", req.site);
				res.locals.useTwitter = this._findAPI("twitter", req.site);
				// render
				this.render( req, res );

			break;
			case "POST":

				var db = req.site.models.user;
				var passport = req.site.helpers.passport.self();
				// (use set() instead)
				var data = _.extend( (new db.schema()), req.body );
				// validate response first...
				var valid = this._validateData( data );
				if( !valid ) return res.redirect('/account/register');

				// filter data
				delete data.password_confirm;
				// update the existing user model
				//...
				// update password
				data.password = this._encryptPassword( data.password );
				// add date attributes
				data.created = data.updated = (new Date()).getTime();

				var actions = [

					// first check if there's an existing user with that email
					function( next ){
						db.findOne({ email: data.email },
						function( err, user ) {
							// then try to login
							if( user ){
								// show alert
								self.alert("error", "This email is already registered");
								if( !user.active ){
									// re-send verification email
									var mailer = new Mailer( req.site );
									mailer.register({
										name: user.name,
										email: user.email,
										cid: user.cid
									});
								}
								res.redirect('/account/register');
								return next({ error: "emailRegistered" });
							}
							// free to create account
							next( null );
						});
					},

					// create new user
					function( next ){
						// include common id
						data.cid = db.createCID();

						db.create(data, function( err, result ){
							// show alert
							self.alert("success", "Account created. Check your email for the activation link");
							// send a verification email
							var mailer = new Mailer( req.site );
							mailer.register({
								name: data.name,
								email: data.email,
								cid: data.cid
							});

							// validate data?
							next( null );
						});

					},

					// verify data - update session
					function( next ){
						// back to the index page
						res.redirect('/');
/*
						passport.authenticate('local', { successRedirect: '/', failureRedirect: '/account/login' })(req, res, function(error){
							// on error display this
							console.log(error);
						});
*/
					}

				];

				// execute
				async.series( actions );

			break;
			default:
				// else redirect to the homepage
				res.redirect('/');
			break;
		}

	},

	// delete user account
	"delete" : function(req, res){

		var self = this;
		//
		this.ensureAuthenticated(req, res);
		// variables
		var user = ( typeof req.user != "undefined" ) ? req.user : false;
		var id = req.query["_key"];

		// prerequisites
		// - if no user. exit now
		if( !user ) return res.redirect('/');
		// - verify the user id...
		if( typeof id !== "string" || user.id !== id ) return res.redirect('/account');

		// databases
		var users = req.site.models.user;
		var assets = this.options.assets;
		var actions = [];

		// delete user related assets
		for( var i in assets ){
			var model = req.site.models[ assets[i] ] || false;
			if( !model ) continue;
			// delete related data on this model
			actions.push( this._deleteData( model, id ) );
		}

		actions.push(function(next){
			// delete account
			users.delete({ id : id }, function(){
				// error control?
				// trigger state method...
				self._onDelete(req, res);
				res.redirect('/logout');
				return next(null);
			});
		});

		// execute actions in sequence
		async.series( actions,
		function(err, results){
			//console.log(err, results)
			//return res.redirect('/logout');
		});

	},

	verify: function(req, res){
		// we need an id to continue
		if( typeof req.query["_key"] != "string" ) return res.redirect('/');

		var self = this;
		var db = req.site.models.user;
		var cid = req.query["_key"];

		// supporting flash middleware
		this.alert = alerts( req, res );

		db.findOne({ cid: cid }, function( err, user ){
			if( !user ) return res.redirect('/');
			// if already active move on
			if( user.active ) {
				self.alert("info", "Account already active. Please login");
			} else {
			// activate account (don't wait?)
				db.update({
					id: user.id,
					active: 1
				});
				self.alert("success", "Account activated. You can now login");
			}
			// update session ( better way to pass this info?)
			req.user = req.user || {};
			req.user.email = user.email;
			req.user.password = user.password;
			// post registation actions
			self._postRegister(req, res);
			// either way return to the login page
			return res.redirect('/account/login');
		});


	},

	// Helpers
	// display notifications
	alert: false,

	// Internal methods

	_encryptPassword: function( password ){
		// basic password encryption using brypt
		return bcrypt.hashSync( password, 10 );
	},

	_deleteData: function( model, id ){

		return function( next ){

			model.read({ uid : id }, function( err, data ){
				if( !data ) next(null);
				// convert to an array if returning a single object
				data = (data instanceof Array) ? data : [data];
				//
				var count = 0;
				for(var i in data){
					model.delete({ id : data[i].id }, function(err, result){
						count++;
						//
						if(count == data.length) next(null);
					});
				}

			});

		};
	},

	// Events

	// - when the account is created (unverified)
	onCreate: function(req, res){

	},

	// - when a user has successfullt logged in
	onLogin: function(req, res){

	},

	// - when an account has been deleted
	onDelete: function(req, res){

	},

	// - when an account has been verified
	postRegister: function(req, res){
		// override with your own custom method
	},

	// Private

	_onCreate: function(req, res){
		this.onCreate(req, res);
	},

	// - when a user has successfully logged in
	_onLogin: function(req, res){
		this.onLogin(req, res);
	},

	// - when an account has been deleted
	_onDelete: function(req, res){
		this.onDelete(req, res);
	},

	_postRegister: function(req, res){
		this.postRegister(req, res);
	},

	_findAPI: function( name, site){
		try {
			return (typeof site.config.api[name] == "object" );
		} catch( e ) {
			//( req.site.config.api.twitter )
			return false;
		}
	},

	_validateData: function( data ){
		if( _.isEmpty(data.password) || data.password !== data.password_confirm ){
			// show alert
			this.alert("error", "The passwords didn't match");
			return false;
		}
		return true;
	}

});

// Helpers

function alerts( req, res ){
	// thisis the method used to alert messages during validation...
	return function( type, message ){
		// support flash middleware
		if( req.flash ) req.flash(type, message);
	}
}

module.exports = controller;
