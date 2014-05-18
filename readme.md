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

## Controllers

This extension has the following controllers ,each adding additional paths to your app:

### Account

This controller is used to authenticate against 3rd party providers.

#### Endpoints

```
account/login
account/complete
account/register
account/delete
```

### Auth

This controller is used to authenticate against 3rd party providers

#### Endpoints

These paths are optional and only active if the API details for each provider are available.

```
auth/facebook
auth/twitter
```


## Credits

Initiated by [Makis Tracend](http://github.com/tracend)

Distributed through [Makesites.org](http://makesites.org/)


## License

Released under the [MIT license](http://makesites.org/licenses/MIT)
