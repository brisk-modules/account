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
		// asynchronous verification, for effect...
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
