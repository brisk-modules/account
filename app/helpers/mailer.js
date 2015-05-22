var _ = require('underscore'),
	fs = require("fs"),
	brisk = require("brisk"),
	hbs = require("hbs"),
	nodemailer = require('nodemailer'),
	ses = require('nodemailer-ses-transport'),
	Main = brisk.getClass("main");

var helper = Main.extend({

	options: {
		user: {}
	},

	data: {}, // convert this to a model?

	init: function( site ){
		// site is not optional in this version...
		this.site = site;
		// load messages (once?)
		this.data.register = {
			text: loadFile( this.site._findFile( "app/views/email-verify-text" ) +".txt" ),
			html: loadFile( this.site._findFile( "app/views/email-verify-html" ) +".html" )
		}
	},

	register: function( user, cb ){
		// fallbacks
		user = user || {};
		cb = cb || function(){};
		// variables
		var site = this.site.loadConfig('site');
		// main fields - fallback to options
		user.name = cleanName( user.name || this.options.user.name || "" );
		user.email = user.email || this.options.user.email || false;
		site.url = site.url || this.site.config.url || false;
		site.name = cleanName( site.name || this.site.config.name || "" );
		// prerequisites
		if( !user.email || !site.url) return; // all other fields are non-breaking?

		// Create a Direct transport object
		//var transport = nodemailer.createTransport("Direct", {debug: true});
		// Create an Amazon SES transport object
		var transport = nodemailer.createTransport(ses({
			accessKeyId: this.site.config.api.aws.key,
			secretAccessKey: this.site.config.api.aws.secret
			//region: "us-east-1" // option?
		}));

		//console.log('SES Configured');

		// optional DKIM signing
		/*
		transport.useDKIM({
			domainName: "do-not-trust.node.ee", // signing domain
			keySelector: "dkim", // selector name (in this case there's a dkim._domainkey.do-not-trust.node.ee TXT record set up)
			privateKey: fs.readFileSync(pathlib.join(__dirname,"test_private.pem"))
		});
		*/

		// Message object
		// FIX: clean names from special characters
		var message = {

			// sender info
			from: site.name +' <'+ site.email +'>',

			// Comma separated list of recipients
			to: '"'+ user.name +'" <'+ user.email +'>',

			// Subject of the message
			subject: site.name +': Thanks for registering!', //

			// plaintext body
			text: this.data.register.text({ user: user, site: site }),

			// HTML body
			html: this.data.register.html({ user: user, site: site }),

			// An array of attachments
			//attachments:[]
		};

		//console.log('Sending Mail', message);

		transport.sendMail(message, function(error, response){
			if(error){
				console.log('Error occured');
				console.log(error.message);
				return cb( error );
			}else{
				//console.log(response);
				//console.log('Message sent successfully!');
				return cb(null, true); // success
			}

		});


	},

	self: function() {
		//return this;
	},


});

// Helpers

function loadFile( file ){
	var string = fs.readFileSync( file, "utf8");
	var template = hbs.compile( string );
	return template;
}

function cleanName( name ){
	// only accept strings (use toString() in some cases?)
	if( typeof name != "string" ) name = "User";
	// remove special characters
	name = name.replace(/[!:@#$%^&*]/g, "");
	return name;
}

module.exports = helper;
