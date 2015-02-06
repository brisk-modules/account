var Model = require("brisk").getBaseModel("model"),
	_ = require("underscore");

var model = Model.extend({

	options: {
		archive: true, // by default data is archives and not deleted
		backend: "" // customize with your db table
	},

	init: function( site ){
		// db
		this.db = site.modules.db || null; // error control?
		this.backend = this.options.backend;
	},

	schema : function(){

		return {
			"cid": (new Model()).createCID(), // common id (publically available)
			"active": 0,
			"accounts": {}, // container for third-party auth
			"name": "",
			"username": "",
			"email": 0, // email is used for authentication
			"password": 0,
		};

	},

	sync: function(req, res){
		// make sure this is the app
		//console.log("@@@@@@@@@@ syncing User" );
	}

});

module.exports = model;