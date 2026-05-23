var Module = require("brisk").getHelper("module"),
	_ = require("underscore"),
	defaults = require("../config/defaults");

var Main = Module.extend({
	dir : __dirname,
	
	config: function( site ){
		var account = site.loadConfig("account");
		return _.extend({}, defaults, account);
	}
});

module.exports = new Main();