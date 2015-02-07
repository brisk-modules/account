var _ = require("underscore"),
	hbs = require('hbs'),
	gravatar = require("gravatar"),
	Parent = require("brisk").getClass("main");

var helper = Parent.extend({

	gravatar: function(email, size) {
		if(typeof email == "undefined" || typeof size == "undefined") return "";
		return gravatar.url(email, {s: size}, true);
	}

});


module.exports = helper;
