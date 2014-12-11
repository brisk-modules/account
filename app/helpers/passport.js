var passport = require("passport"),
	_ = require('underscore'),
	bcrypt = require("bcrypt"),
	LocalStrategy = require('passport-local').Strategy,
	TwitterStrategy = require('passport-twitter').Strategy,
	FacebookStrategy = require('passport-facebook').Strategy,
	Main = require("brisk").getClass("main");

var helper = Main.extend({

	init: function( site ){

		this.model = site.models.user;
		this.site = site;

		// Use the LocalStrategy within Passport.
		passport.use(new LocalStrategy({
				usernameField: 'email'
			}, _.bind(this.local, this) ));

		// Helpers
		passport.serializeUser(function(user, done) {
			done(null, user);
		});

		passport.deserializeUser(function(user, done) {
			done(null, user);
		});

		this.passport = passport;

		// setup other strategies
		this._setup();

	},
	self: function() {
		return this.passport;
	},

	// extend with your own strategy setup
	setup: function(){

	},

	local: function(email, password, done) {
		var self = this;
		// asynchronous verification, for effect...
		process.nextTick(function () {

			var query = self.model.find({ 'email': email }, function (err, user) {

				if (err) { return done(err); }
				if (!user) { return done(null, false, { error: "no_user", message: 'Unknown user ' + email }); }
				if (!user.active) { return done(null, false, { error: "not_active", message: 'Account is not active' }); }
				if (!user.password) { return done(null, false, { error: "no_password", message: 'No password set for ' + email }); }
				// compare password
				self.comparePassword(password, user, done);

			});

		});
	},


	twitter: function(token, tokenSecret, profile, done) {

		profile.token = {key : token, secret : tokenSecret };
		this.service("twitter", profile, done);

	},

	// also compatible with: github
	facebook: function(accessToken, refreshToken, profile, done) {

		profile.token = {access : accessToken, refresh : refreshToken };
		this.service("facebook", profile, done);

	},

	// authenticate through a third party service
	service: function(type, profile, callback) {

		var self = this;
		var model = this.model;
		var options = {};

		// find email
		if( !profile.email && profile.emails instanceof Array ){
			profile.email = profile.emails[0].value;
		}

		var key = 'accounts.'+ type +'.id';
		var query = {};
		query[key] = profile.id;

		var query = model.findOne(query, function (err, userByAccount) {

			if( userByAccount ) {
				// this third-party account has already been used
				// update existing credentials
				var data = self.extendUser(type, userByAccount, profile);
				// continue...
				options.action = "update";
				return callback(null, data, options);

			} else {
				// user async module for this?
				if( profile.email ){
					// check if the email has been used
					model.findOne({ 'email': profile.email }, function (err, userByEmail) {
						if(userByEmail) {
							var data = self.extendUser(type, userByEmail, profile);
							options.action = "update";
						} else {
							// this is a new user...
							var data = self.newUser(type, model, profile);
							options.action = "create";
						}
						// redirect user
						return callback(null, data, options);
					});
				} else {
					// no email provided in profile
					// assuming this is a new user...
					var data = self.newUser(type, model, profile);
					options.action = "create";
					return callback(null, data, options);
				}

			}

		});
	},

	createStrategy: function( type, Strategy ){

		var config = this.site.config || false;
		var options = {};
		// prerequisite
		if( !config ) return;
		var api = config.api[type];

		// separate OAuth v1 & v2 config (incomplete)
		if( type == "twitter"){
			options = {
				consumerKey: api.key,
				consumerSecret: api.secret,
			};
		} else {
			options = {
				clientID: api.key,
				clientSecret: api.secret
			};
			if(type == "facebook") options.profileFields = ["id", "username", "displayName", "emails"]; // also available: "name", "first_name", "last_name", "link", "gender", "locale", "age_range", "photos"
		}
		options.callbackURL =  config.url +"/auth/callback/service/"+ type;

		// init strategy
		this.passport.use( new Strategy( options, _.bind(this[type], this) ));

	},

	// User methods

	extendUser: function ( service, user, profile){
		// fallbacks
		user.accounts = user.accounts || {};
		user.accounts[service] = user.accounts[service] || {};

		user.accounts[service] = _.extend(
		user.accounts[service], {
			id : profile.id,
			user : profile.username,
			token : profile.token
		});

		return user;
	},

	newUser: function ( service, model, profile ){
		var user = _.extend( (new model.schema()), {
			name : profile.displayName || profile.name || ""
		});
		// fallbacks
		user.accounts = user.accounts || {};
		user.accounts[service] = user.accounts[service] || {};

		user.accounts[service] = _.extend(
		user.accounts[service], {
			id : profile.id,
			user : profile.username,
			token : profile.token
		});

		if( profile.email ){
			user.email = profile.email;
		}
		return user;
	},

	// Password methods

	comparePassword: function(password, user, callback){
		bcrypt.compare(password, user.password, function(err, res) {
			if( res == true ) return callback(null, user);
			return callback(null, false, { message: "The password you entered is incorrect" });
		});
	},

	// Internal

	// setup strategies
	_setup: function(){

		var api = this.site.config.api || {};

		if( api.twitter ){
			this.createStrategy("twitter", TwitterStrategy);
		}

		if( api.facebook ){
			this.createStrategy("facebook", FacebookStrategy);
		}

		// user defined:
		this.setup();
	}

});


module.exports = helper;
