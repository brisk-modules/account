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

	},

	facebook: function(accessToken, refreshToken, profile, done) {

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
			this.createStrategy("facebook", TwitterStrategy);
		}

		// user defined:
		this.setup();
	}

});


module.exports = helper;
