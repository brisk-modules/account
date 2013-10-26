var passport = require("passport"),
	_ = require('underscore'),
	bcrypt = require("bcrypt"),
	LocalStrategy = require('passport-local').Strategy,
	TwitterStrategy = require('passport-twitter').Strategy,
	FacebookStrategy = require('passport-facebook').Strategy,
	Main = require("brisk").getClass("main");

var User;

var helper = Main.extend({

	init: function( site ){

		var api = site.config.api;

		User = site.models.user;

		// Use the LocalStrategy within Passport.
		passport.use(new LocalStrategy({
				usernameField: 'email'
			}, this.local));

		passport.use(new TwitterStrategy({
			consumerKey: api.twitter.key,
			consumerSecret: api.twitter.secret,
			callbackURL: site.config.url +"/auth/callback/service/twitter"
			}, this.twitter));

		passport.use(new FacebookStrategy({
			clientID: api.facebook.key,
			clientSecret: api.facebook.secret,
			callbackURL: site.config.url +"/auth/callback/service/facebook"
		}, this.facebook));

		// Helpers
		passport.serializeUser(function(user, done) {
			done(null, user);
		});

		passport.deserializeUser(function(user, done) {
			done(null, user);
		});

		this.passport = passport;

	},
	self: function() {
		return this.passport;
	},

	local: function(email, password, done) {
		// asynchronous verification, for effect...
	},

	twitter: function(token, tokenSecret, profile, done) {

	},

	facebook: function(accessToken, refreshToken, profile, done) {

	}

});


module.exports = helper;
