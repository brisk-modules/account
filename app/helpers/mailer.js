var _ = require('underscore'),
	fs = require("fs"),
	brisk = require("brisk"),
	nodemailer = require('nodemailer'),
	Main = brisk.getClass("main");

var helper = Main.extend({

	options: {
		user: {}
	},

	init: function( site ){
		// site is not optional in this version...
		this.site = site;
	},

	register: function( user ){

		var site = brisk.loadConfig('site');

		// check user details
		user = user || {};
		// fallback to options
		user.name = user.name || this.options.user.name || "";
		user.email = user.email || this.options.user.email || false;
		// prerequisite
		console.log( "user", user );
		if( !user.email ) return; // all other fields are non-breaking?

		// Create a Direct transport object
		//var transport = nodemailer.createTransport("Direct", {debug: true});
		// Create an Amazon SES transport object
		var transport = nodemailer.createTransport("SES", {
			AWSAccessKeyID: this.site.config.api.aws.key,
			AWSSecretKey: this.site.config.api.aws.secret,
			ServiceUrl: "https://email.us-east-1.amazonaws.com" // optional
		});

		console.log('SES Configured');

		// optional DKIM signing
		/*
		transport.useDKIM({
			domainName: "do-not-trust.node.ee", // signing domain
			keySelector: "dkim", // selector name (in this case there's a dkim._domainkey.do-not-trust.node.ee TXT record set up)
			privateKey: fs.readFileSync(pathlib.join(__dirname,"test_private.pem"))
		});
		*/

		// Message object
		var message = {

			// sender info
			from: site.name +' <'+ site.email +'>',

			// Comma separated list of recipients
			to: '"'+ user.name +'" <'+ user.email +'>',

			// Subject of the message
			subject: site.name +': Thanks for registering!', //

			// plaintext body
			text: fs.readFileSync( this.site._findFile( "app/views/email-verify-text" ) +".txt", "utf8"),

			// HTML body
			html: fs.readFileSync( this.site._findFile( "app/views/email-verify-html" ) +".html", "utf8"),

			// An array of attachments
			attachments:[]
		};

		console.log('Sending Mail', message);

		transport.sendMail(message, function(error, response){
			if(error){
				console.log('Error occured');
				console.log(error.message);
				return;
			}else{
				console.log(response);
				console.log('Message sent successfully!');
			}

		});

	},

	self: function() {
		//return this;
	},


});


module.exports = helper;
