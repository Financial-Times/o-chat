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

## Logging
Logging can be enabled for debugging purposes. It logs using the global 'console' if available (if not, nothing happens and it degrades gracefully).
By default logging is disabled.

### enableLogging
This method enables logging of the module.

### disableLogging
This method disables logging of the module.

### setLoggingLevel
This method sets the logging level. This could be a number from 0 to 4 (where 0 is debug, 4 is error), or a string from the available methods of 'console' (debug, log, info, warn, error).
Default is 3 (warn).

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
    + normal: the commenting box is placed on top of the comment stream, and the comments are ordered as newest on top.
    + inverted: the commenting box is placed at the bottom of the comment stream, and the comments are ordered newest on bottom.
    
    Default value is 'normal'.
 - layout: Specifies the layout style of the widget. It can have two values:
    + normal: When placed in the main area of the page.
    + side: When placed in the side area of the page.
    
    Default value is 'normal'.
 - datetimeFormat: How to format the timestamps. This is an object and has two fields:
    + minutesUntilAbsoluteTime: specifies after how many minutes to switch from relative time to absolute. If -1 is specified, the timestamps will be in the absolute format immediately. By default it is set to 14 days.
    + absoluteFormat: specifies the format with which the absolute timestamp is rendered. For more information about the possible values please visit: https://github.com/Financial-Times/o-date#o-dateformatdate-tpl

##### Methods
###### load
This method initiates loading the necessary data to load the widget (e.g. comments, user authentication info), and using the data generates the UI elements within the page.

This method can be called once (calling it multiple types will have no effect).

###### adaptToHeight
Calling this method with a height in pixels as parameter will adapt the UI to shrink within that height. If the current UI is smaller, it will fill the space to occupy the full height, or if the current UI is taller, a scroll will appear on the comments.

###### init
<strong>This method is used internally, but its behavior can be overridden if desired.</strong> This method is responsible to get the initialization data (e.g. collection info, comments), and also to initialize streaming from Livefyre (e.g. a new comment added, comment deleted).
As a parameter it has a callback which should be called when the loading finished passing also the obtained data as parameter.

```javascript
widget.init(callback) {
    loadComments(function (comments) {
        callback(comments);
    });
};
```

###### loadResources
<strong>This method is used internally, but its behavior can be overridden if desired.</strong> This method is responsible to load any third party resources that are needed to load the widget. By default this method does nothing for o-comment-client widget.
A callback is passed as a parameter, which should be called when all resources are fully loaded.

```javascript
widget.loadResources(callback) {
    loadResource1();
    loadResource2();
    callback();
};
```

###### render
<strong>This method is used internally, but its behavior can be overridden if desired.</strong> This method is responsible to render the UI using the comments available as a parameter. The second parameter is a callback, which should be called when the UI is rendered.

```javascript
widget.render(comments, callback) {
    renderUi(comments);
    callback();
}
```

###### getWidgetEl
Returns the DOM element of the widget container.

###### on
With this method you can listen to events generated by the widget instance.

###### off
With this method event handlers attached with `on` can be deleted.


##### Properties
Available on any instance of Widget.

###### config
This is the config object passed as a parameter populated with default configuration items where those are not provided.

###### ui
Instance of WidgetUi, which is linked to the widget's DOM. Any call to this instance would affect only the widget's UI.

###### collectionId
Livefyre's collection ID for the current article. <strong>Populated only after the widget is loaded (`load` function)!</strong>

###### timeout
Seconds after a timeout is considered when loading the widget.


##### Events
Handling these events is available using the `on` function of a widget instance.

e.g.:

```javascript
widget.on('eventName', function (additionalParameters) {
    // handle the event
});
```

###### timeout.widget
Loading timed out.

###### error.resources
Error while loading the resources.
Parameters: error object/message.

###### error.init
Error while loading the initialization data and the comments.
Parameters: error object/message.

###### error.widget
Error for any reason.
Parameters: error object/message.

###### loaded.init
Loaded when the initialization is finished and the necessary data is obtained.
Parameters: initialization data in the following form:

```javascript
{
    "collection": {
        "unclassified": false,
        "collectionId": "91440735",
        "lastEvent": 1411541039265900,
        "comments": [{
            "parentId": "",
            "author": {
                "displayName": "roli main",
                "tags": ["FT"],
                "type": 1
            },
            "content": "<p>comment</p>",
            "timestamp": 1411541039,
            "commentId": "216743299",
            "visibility": 1
        }],
        "totalPages": "6"
    }
}
```

For more information please visit the o-comment-data module, getComments endpoint.

###### ready.widget
The widget has all the information needed to generate the UI.

###### loaded.auth
User authentication details loaded.
Parameters: authentication data.

For more information please visit the o-comment-data module, getAuth endpoint.

###### renderComplete.widget
The UI is fully generated.

###### commentPosted.tracking
A comment is posted within the widget.
Parameters:
 - collectionId
 - info about the comment:
     + id
     + bodyHtml: the content of the comment
     + author:
         * displayName: the author's pseudonym

###### commentDeleted.tracking
A comment is deleted within the widget.
Parameters:
 - collectionId
 - info about the comment:
     + id


### auth
This submodule is responsible for handling the user's authentication status.

##### Methods
###### login
This method broadcasts a login event to every module that are listening to it.

###### logout
This method broadcasts a logout event to every module that are listening to it.

###### on
Using this method you can listen to the events generated by this module.

###### off
Using `off` the event handlers attached using `on` can be removed.

###### loginRequired
Using this method you can explicitly request an authenticated status. It handles different scenarios:

 - user already has authentication data, so it can be logged in
 - user has no pseudonym, ask for pseudonym
 - user has session expired, ask to log in again
 - user is not authenticated, ask to log in

Parameters:
 - delegate: Optional. An object can be added with two functions: success and failure. If the login process ends successfully, delegate.success is called. If the login process fails or it is refused by the user, delegate.failure is called.
 - force: Optional. If true, the local cache is ignored and the web service is directly asked for the login status.

##### Events
These are the events that can be handled using the auth object.

###### login
Triggered when the user is logged in.
Parameters:
 - token
 - pseudonym
 - isAdmin

###### logout
Triggered when the user is logged out.
No parameters.

###### loginRequired.authAction
If the user is not logged in, this event is generated. The login process of the page within the comment module is included is abstract, so it should be handled by the page.
It gets also a parameter, an object with two functions: success and failure. If the login process is successful, the success method should be called. If it fails or refused, the failure method should be called.

```javascript
auth.on('loginRequired.authAction', function (delegate) {
    if (logInSuccess) {
        delegate.success();
    }

    if (logInFails || logInRefused) {
        delegate.failure();
    }
});
```