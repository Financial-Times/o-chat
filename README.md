# o-comment-client

Commenting widget built on top of data APIs provided by o-comment-data module. This Widget uses both SUDS (Session user data service) and CCS (Comment creation service).

---

## How to use it
There are two ways of using this module:

### Standalone
Run `grunt`, then insert the JS found in the dist folder:

```javascript
<script src="dist/javascripts/oCommentClient.min.js"></script>
```

The module's API can be accessed using `oCommentClient` in the global scope.

### Bower and browserify
With bower, simply require the module:

```javascript
var oCommentClient = require('o-comment-client');
```

The module should be built using `browserify` (with `debowerify` transform).

---

## Configuration
<strong>The methods which are meant to configure the module are the following:</strong>

### init
This method is responsible for changing the default configuration used by this module. Calling this method with an object will merge the default configuration with the object specified (deep merge, primitive type values of the same key will be overwritten).

In order to use this module with authentication enabled, you should specify the user's session ID:

```javascript
oCommentClient.init({
    sessionId: 'sessID'
});
```

##### Default configuration

```javascript
{
    "livefyre": {
        "network": "ft.fyre.co"
    }
}
```


##### Change the environment
In order to change to the TEST environment, use the following code (o-comment-data should be switched to TEST env as well):

```javascript
{
    "livefyre": {
        "network": "ft-1.fyre.co"
    },
    "dependencies": {
        "o-comment-data": {
            "suds": {
                "baseUrl": "http://test.session-user-data.webservices.ft.com"
            },
            "ccs": {
                "baseUrl": "http://test.comment-creation.webservices.ft.com"
            },
            "cacheConfig": {
                "authBaseName": "comments-test-auth-",
                "initBaseName": "comments-test-init-"
            },
            "livefyre": {
                "networkName": "ft-1"
            }
        }
    }
}
```

## API

### Widget
Widget incorporates all aspects of a commenting Widget: handling data and creating the UI.

##### Configuration
To create an instance, you need to provide a configuration object. This should have the following structure:

###### Mandatory fields:
 - elId: ID of the HTML element in which the widget should be loaded
 - articleId: ID of the article, any string
 - url: canonical URL of the page
 - title: Title of the page
    
###### Optional fields:
 - order: This specifies how the widget is built. It can have two values:
    - normal: the commenting box is placed on top of the comment stream, and the comments are ordered as newest on top.
    - inverted: the commenting box is placed at the bottom of the comment stream, and the comments are ordered newest on bottom.
    
    Default value is 'normal'.
 - layout: Specifies the layout style of the widget. It can have two values:
    - normal: When placed in the main area of the page.
    - side: When placed in the side area of the page.
    
    Default value is 'normal'.
 - datetimeFormat: How to format the timestamps. This is an object and has two fields:
 - minutesUntilAbsoluteTime: specifies after how many minutes to switch from relative time to absolute. If -1 is specified, the timestamps will be in the absolute format immediately. By default it is set to 14 days.
 - absoluteFormat: specifies the 

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