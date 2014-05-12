var _ = require('underscore'),
	brisk = require("brisk"),
	bcrypt = require("bcrypt"),
	Parent = brisk.getBaseController("main"),
	async = require("async");

var controller = Parent.extend({
	name: "account",

	index : function(req, res){

		this.ensureAuthenticated(req, res);
		//
		res.view = "account";
		this.render( req, res );

	},

	// login to an existing account
	login : function(req, res){
		// if authenticated redirect to the homepage
		if( this.isAuthenticated(req, res) ) return res.redirect('/');

		switch( req.method ){
			case "GET":

				res.view = "account-login";
				// local vars
				res.locals.useFacebook = this._findAPI("facebook", req.site);
				res.locals.useTwitter = this._findAPI("twitter", req.site);
				//
				this.render( req, res );

			break;
			case "POST":

				var passport = req.site.helpers.passport.self();
				// process submitted credentials

				passport.authenticate('local', { successRedirect: '/', failureRedirect: '/account/login', failureFlash: true})(req, res, function(error){
					// on error display this
					console.log("error authenicating: ", error);
				});

			break;
			default:
				// else redirect to the homepage
				return res.redirect('/');
			break;
		}

	},


	// prompt the user to complete the authentication
	complete : function(req, res){

		// this auth state is a bit peculiar  at this page
		// we accept users that are logged in but have no password
		// get user
		var user = ( typeof req.user != "undefined" ) ? req.user : false;
		// straight to the dashboard if there is already an email/pass
		if(user && user.password ) return res.redirect('/');

		switch( req.method ){
			case "GET":

				// back to login if no user in session
				if( !user ) res.redirect('/account/login');
				// set template vars
				if( !user.email ){
					res.locals.noEmail = true;
				}
				//res.template = "main";
				res.view = "account-complete";
				// render
				this.render( req, res );

			break;
			case "POST":

				var db = req.site.models.user;
				var passport = req.site.helpers.passport.self();
				// update the existing user model
				// validate response first... (use set() instead)
				var data = req.body;
				data.id = user.id;
				// filter data
				delete data.password_confirm;
				// update password
				data.password = bcrypt.hashSync( data.password, 10 );
				// add date attributes
				data.created = data.updated = (new Date()).getTime();

				db.update(data, function(){

					// update the user
					req.user.email = data.email;
					req.user.password = data.password;

					// verify data - update session:
					passport.authenticate('local', { successRedirect: '/', failureRedirect: '/account/login' })(req, res, function(error){
						// on error display this
						console.log(error);
					});

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

		// this auth state is a bit peculiar  at this page
		// we accept users that are logged in but have no password
		// get user
		var user = ( typeof req.user != "undefined" ) ? req.user : false;
		// straight to the dashboard if there is already an email/pass
		if(user && user.password ) return res.redirect('/');

		switch( req.method ){
			case "GET":

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
				// update the existing user model
				// validate response first... (use set() instead)
				var data = _.extend( (new db.schema()), req.body );
				// filter data
				delete data.password_confirm;
				// update password
				data.password = bcrypt.hashSync( data.password, 10 );
				// add date attributes
				data.created = data.updated = (new Date()).getTime();

				var actions = [

					// first check if there's an existing user with that email
					function( next ){
						db.read({ email: data.email },
						function( user ) {
							// then try to login
							if( user ){
								// show alert
								if( req.flash ) req.flash("error", "This email is already registered");
								res.redirect('/account/register');
								return next({ error: "emailRegistered" });
							}
							// free to create account
							next( null );
						});
					},

					// create new user
					function( next ){

						db.create(data, function( result ){
							// validate data?
							next( null );
						});

					},

					// verify data - update session
					function( next ){

						passport.authenticate('local', { successRedirect: '/', failureRedirect: '/account/login' })(req, res, function(error){
							// on error display this
							console.log(error);
						});

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
		if( !user ) return res.redirect('/account');
		// - verify the user id...
		if( typeof id !== "string" || user.id !== id ) return res.redirect('/account');

		// databases
		var users = req.site.models.user;
		var models = this._userRelatedModels();
		var actions = [];

		for( var i in models ){
			var model = req.site.models[ models[i] ] || false;
			if( !model ) continue;
			// delete related data on this model
			actions.push( this._deleteData( model, id ) );
		}

		actions.push(function(next){
			// delete account
			users.archive({ id : id }, { $set: { updated : "timestamp" } }, function(){
				// error control?
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

	// Internal methods

	_deleteData: function( model, id ){

		return function( next ){

			model.read({ uid : id }, function( data ){
				if( !data ) next(null);
				// convert to an array if returning a single object
				data = (data instanceof Array) ? data : [data];
				//
				var count = 0;
				for(var i in data){
					model.archive({ id : data[i].id }, { $set: { updated : "timestamp", active : 0 } }, function(){
						count++;
						//
						if(count == data.length) next(null);
					});
				}

			});

		};
	},

	// - list models related with users
	_userRelatedModels: function(){
		// overwrite this with your custom logic
		return [];
	},

	_findAPI: function( name, site){
		try {
			return (typeof site.config.api[name] == "object" );
		} catch( e ) {
			//( req.site.config.api.twitter )
			return false;
		}
	}

});



module.exports = controller;
