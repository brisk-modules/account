# Brisk: Account

Account management for Brisk


## Dependencies

* [Brisk](https://github.com/makesites/brisk)
* [Passport](https://github.com/jaredhanson/passport)
* [Handlebars](https://github.com/donpark/hbs)


## Install

Using NPM
```
npm install brisk-account
```

## Configuration

You can override the module's default configuration by adding an `account.js` file to your Brisk application's `config/` directory.

### Options
* `mailer` (Boolean/Integer): Set to `0` or `false` to disable sending emails (such as verification links) upon account registration. Defaults to `1` (true).

## Controllers

This extension has the following controllers, each adding additional paths to your app:

### Account

This controller is used for local account management, including registration, login, and profile operations.

#### Endpoints

```
account/
account/login
account/complete
account/register
account/delete
account/reset
account/verify
```

### Auth

This controller is used to handle authentication against local and 3rd party providers, as well as their respective callbacks.

#### Endpoints

These paths are optional and only active if the API details for each provider are available.

```
auth/user
auth/callback
auth/facebook
auth/twitter
```


## Credits

Initiated by [Makis Tracend](http://github.com/tracend)

Distributed through [Makesites.org](http://makesites.org/)


## License

Released under the [MIT license](http://makesites.org/licenses/MIT)
