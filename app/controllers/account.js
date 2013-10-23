var _ = require('underscore'),
	brisk = require("brisk"),
	bcrypt = require("bcrypt"),
	Parent = brisk.getBaseController("main");

var controller = Parent.extend({
	index : function(req, res){

		this.ensureAuthenticated(req, res);
		//
		res.view = "account";
		this.render( req, res );

	},

	// login to an existing account
	login : function(req, res){

		switch( req.method ){
			case "GET":

				res.view = "account-login";
				this.render( req, res );
				//this.main.render( res );

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
				data.email = data.email;
				data.password = bcrypt.hashSync( data.password, 10 );
				// add date attributes
				data.created = data.updated = (new Date()).getTime();

				db.update(data, function(){

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

	},

	// delete user account
	delete : function(req, res){

		var self = this;

		this.ensureAuthenticated(req, res);

		var user = ( typeof req.user != "undefined" ) ? req.user : false;
		// databases
		var users = req.site.models.user;
		var gateways = req.site.models.gateway;
		var products = req.site.models.product;

		if( typeof req.query["_key"] != "string" ) return res.redirect('/account');

		//
		var id = req.query["_key"];

		// first read and verify the owner...
		if(user.id != id) return;
		// variables to monitor when all operations are completed
		var doneGateways = doneProducts = false;
		var done = function( type ){

			switch( type ){
				case "gateways":
					doneGateways = true;
				break;
				case "products":
					doneProducts = true;
				break;
			}
			// check if we're all done
			if( doneGateways && doneProducts && doneGateways==doneProducts )
				return res.redirect('/logout');

		}
		// delete account
		users.archive({ id : id }, { $set: { updated : "timestamp" } }, function(){
			// error control?

			// delete related products
			products.read({ uid : id }, function( data ){
				if( !data ) done( "products" );
				// convert to an array if returning a single object
				data = (data instanceof Array) ? data : [data];
				//
				var count = 0;
				for(var i in data){
					products.archive({ id : data[i].id }, { $set: { updated : "timestamp", active : 0 } }, function(){
						count++;
						//
						if(count == data.length) done( "products" );
					});
				}

			});

			// delete related gateways
			gateways.read({ uid : id }, function( data ){
				if( !data ) done( "gateways" );
				// convert to an array if returning a single object
				data = (data instanceof Array) ? data : [data];
				//
				var count = 0;
				for(var j in data){
					gateways.archive({ id : data[j].id }, { $set: { updated : "timestamp", active : 0 } }, function(){
						count++;
						//
						if(count == data.length) done( "gateways" );
					});
				}

			});

		});


	}
});



module.exports = controller;
