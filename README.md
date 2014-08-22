# o-comment-client

## How to use it
There are two ways of using this module:

### Standalone
Run 'grunt', then insert the JS found in the dist folder:

```javascript
<script src="dist/javascripts/commentsCcsWidget.min.js"></script>
```

The module's API can be accessed using the 'commentsCcsWidget' variable.

### Bower and browserify
With bower, the module's API can be accessed by 'o-comments-ccs-widget'.

```javascript
var commentsCcsWidget = require('o-comments-ccs-widget');
```

## API
The main fields that are exposed are the following:

### init
This method is responsible for the configuration used by the module. Calling this method with an object will merge the default configuration with the object specified.

### Widget


##### Configuration
To create an instance, you need to provide a configuration object. This should have the following structure:

###### Mandatory fields:
 - elId: ID of the HTML element in which the widget should be loaded
 - articleId: ID of the article, any string
 - url: canonical URL of the page
 - title: Title of the page
 - <strong>user</strong>: User object which has the following utilities:
    + isLoggedIn: function which returns true or false based on the user's logged in status
    + getSession: function which returns the user's session if he's logged in
    + getUserId: function
    + getEmail: function
    
###### Optional fields:
 - stream_type: livecomments, livechat, liveblog

##### Methods
###### load
The only method that can be called is 'load'. This method will initiate loading Livefyre core resources, getting the necessary information from SUDS, and loading the widget on its place specified.

This method can be called once (calling it multiple types will have no effect).

### enableLogging
This method enables logging of the module. It logs using the global 'console' if available (if not, nothing happens).

### disableLogging
This method disables logging of the module.

### setLoggingLevel
This method sets the logging level. This could be a number from 0 to 4 (where 0 is debug, 4 is error), or a string from the available methods of 'console' (debug, log, info, warn, error).
Default is 3 (warn).

## Default configuration

```javascript
{
    "livefyre": {
        "network": "ft.fyre.co",
        "domain": "ft.auth.fyre.co"
    }
}
```

## Change the environment
In order to change to the TEST environment, use this:

```javascript
var commentsCcsWidget = require('o-comments-ccs-widget');
commentsCcsWidget.init({
    "dependencies": {
        "o-ccs-client": {
            "baseUrl": "http://test.comments-creation-service.webservices.ft.com"
        }
    },
    "livefyre": {
        "network": "ft-int-0.fyre.co",
        "domain": "ft-int-0.auth.fyre.co"
    }
});
```