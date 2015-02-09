# o-chat

Commenting widget built on top of data APIs provided by o-comment-data module. This Widget uses both SUDS (Session user data service) and CCS (Comment creation service).

---

## How to use it
There are two ways of using this module:

### Build tool
Include the script provided by the build tool.
The script exposes a global variable named `oChat`.

### Bower
As a bower dependency:

**Javascript:**

```javascript
var oChat = require('o-chat');
```

**SCSS:**

```ccs
@import 'o-chat/main';
```

The module should be built using `browserify` (with `debowerify` and `textrequireify` transform).

## Configuration
**The methods which are meant to configure the module are the following:**

### init
This method is responsible for changing the default configuration used by this module. Calling this method with an object will merge the default configuration with the object specified (deep merge, primitive type values of the same key will be overwritten).

Call this function before loading the widgets, preferably right after the loading script (How to use it section).

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

---

## Integration
This integration considers that you have included the script using one of the methods mentioned in the `How to use it` section.

The following functions are used only for purpose of illustration, but they are not available as part of this module:
 - readCookie
 - login


**Common steps:**

First the module needs to be integrated with the page's authentication process. The default behavior when the user is not logged in, but the action the user does requires to be logged in (e.g. posting a comment), is to redirect to the FT's login page (https://registration.ft.com).

If the page has a better login process (e.g. show an overlay) instead of redirecting the page, the default behavior can be overridden. There are 2 ways to do this:

1. Override the auth.loginRequiredDefaultBehavior function

Example:

```javascript
oComments.auth.loginRequiredDefaultBehavior = function (evt) {
    // do login in a nicer way

    if (success) {
        callback();
    } else {
        callback(new Error("Failed")); // provide an error as parameter
    }
}
```

**Important: if the log in needs a page reload, don't call the callback at all (there's no success/failure, it's still pending)!**

2. Add an event handler and stop executing other handlers

Example:

```javascript
oChat.on('auth.loginRequired', function (evt) {
    // the user is not logged in, but an action was performed within the comment widget that requires the user to be logged in

    login();
    if (loggedIn) {
        evt.detail.callback();
    } else if (loginRefused) {
        evt.detail.callback(new Error("Refused")); // provide an error as parameter
    } else if (loginFailure) {
        evt.detail.callback(new Error("Failed")); // provide an error as parameter
    }

    evt.stopImmediatePropagation();
});
```

**Important: if the log in needs a page reload, don't call the callback at all (there's no success/failure, it's still pending)!**


### Integration - programatically
Create an instance of the Widget with the parameters that are available:

```javascript
var widgetInstance = new oChat.Widget({
    elId: 'container-id',
    title: document.title,
    url: document.location.href,
    articleId: 'ID-of-the-article',
    order: 'inverted',
    datetimeFormat: {
        minutesUntilAbsoluteTime: -1,
        absoluteFormat: 'MMM dd hh:mm a'
    }
});
```

Instead of elId (ID of a DOM element), you can specify a selector or a DOM element:

```javascript
{
    container: '.selector' || domElement
}
```

If the element doesn't have an ID, a random ID will be generated.

<br/>

Listen the events the widget triggers (optional):

```javascript
widgetInstance.on('tracking.postComment', function (evt) {
    // a comment is posted, do something, track it
});
```

Load the widget:

```javascript
widgetInstance.load();
```

### Integration - using DOM element
The Widget will be created using data from a DOM element.

Include this where you want the widget to load:

```html
<div class="o-chat" id="commentWidget" data-o-chat-autoconstruct="true" data-o-chat-config-title="title-of-the-article" data-o-chat-config-url="page-url" data-o-chat-config-articleId="ID-of-the-article"></div>
```

In order to build the DOM element, follow the steps:

1. Add class o-chat to the container element
2. Add attribute `data-o-chat-autoconstruct="true"`
3. Specify a unique ID
4. Add configuration options that you want to pass to the widget in the following form: data-o-chat-{configName}="{configValue}". Replace `{configName}` and `{configValue}` with the name of the configuration and value you want to pass.

If you need a reference of the JavaScript object created, you can listen the event on the body element the following way:

```javascript
var widgetInstance;
document.body.addEventListener('oChat.domConstruct', function (evt) {
    if (evt.detail.id === 'commentWidget') {
        widgetInstance = evt.detail.instance;
    }
});
```

where evt.detail.id is the ID of the DOM element (in this example `commentWidget`).

**The widgets are automatically constructed on DOM ready.**

---

##### Events
### Widget level events
Widget level events are triggered on the container of the widget. They have the following format:
`oChat.nameOfTheEvent`, where 'nameOfTheEvent' is one of the following mentioned below.

All events has also a payload data to identify the widget from which the event is coming from, and also specific event data if there's some, which has the following format:

```javascript
{
    detail: {
        id: "idOfTheWidget",
        widget: widgetInstance,
        data: {...} //data specific to the event
    }
}
```


There's also an easier way to listen to widget level events, with the following function:

```javascript
widgetInstance.on('nameOfTheEvent', function (evt) {
    // event handler
});
```

*Please note that you should omit the namespace (oChat.) before the event name.*

Using the `off` method event handlers can be removed.

The list of events are:

##### widget.timeout
Triggered when loading the widget exceeded a given time.

###### error.resources
Error while loading the resources.
Event detail data: error object/message.

###### error.init
Error while loading the initialization data and the comments.
Event detail data: error object/message.

###### error.widget
Triggered when any error appear (triggered together with the above mentioned error events).
Event detail data: error object/message.

##### data.init
Loaded when the initialization is finished and the necessary data is obtained.
Event detail data: initialization data in the following form:

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

##### data.auth
The first time the auth object is loaded, it is broadcasted using this event. Event detail data: authentication and user detail data in the following form:

```javascript
{
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJkb21haW4iOiJmdC0xLmZ5cmUuY28iLCJleHBpcmVzIjoxNDE3MTE2Nzk5LCJ1c2VyX2lkIjoiODk0ODc0MzkiLCJkaXNwbGF5X25hbWUiOiJyb2xpIG1haW4ifQ.maN1bKWvDQLA-mvgNp9lSKdI9Izj9rmX3XrEaVwUTNY",
    "expires": 1417116799,
    "displayName": "user pseudonym",
    "settings": {
        "emailcomments": "never",
        "emailreplies": "never",
        "emaillikes": "never",
        "emailautofollow": "off"
    }
}
```

##### widget.ready
The widget is ready to be rendered, the initialization process has finished.

##### widget.renderComplete
The UI is fully rendered.

##### tracking.postComment
A comment is posted.
Event detail data:
 - collectionId
 - info about the comment:
     + id
     + bodyHtml: the content of the comment
     + author:
         * displayName: the author's pseudonym

##### tracking.deleteComment
A comment is deleted within the widget.
Event detail data:
 - collectionId
 - info about the comment:
     + id

### Module level events
These events are triggered on the `body` element. They have the same format as the widget level events: `oChat.nameOfTheEvent`, where nameOfTheEvent is one of the following below.

The payload data consists only of event specific data:

```javascript
{
    detail: {...} // event specific data
}
```

The events are the following:
##### auth.login
Triggered when a user is successfully logged in.
Payload is the jwt token with which the user is logged in.

##### auth.logout
Triggered when a user is logged out.

##### auth.loginRequired
Triggered on any activity which explicitly requires a logged in status. This could mean from the product perspective that the user is not logged in, or his/her login status expired (e.g. session expire).

The payload data contains an object with a callback function. Based on the outcome of the login process, one of these should be called by the handler.
**Important: if the log in needs a page reload, don't call the callback at all (there's no success/failure, it's still pending)!**

```javascript
oChat.on('auth.loginRequired', function (evt) {
    if (logInSuccess) {
        evt.detail.callback();
    }

    if (logInFails || logInRefused) {
        evt.detail.callback(new Error("Failed or cancelled."));
    }
});
```

---

## More about the submodules

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
Methods available:

 - scrollToWidget: scrolls the page to the widget's position.
 - addNotAvailableMessage: adds a not available message into the container
 - clearContainer: clears the widget's container.
 - render: renders the widget using the comments specified as a parameter. This method also registers the necessary event handlers.
 - adaptToHeight: calling this method with a height in pixels as parameter will adapt the UI to shrink within that height. If the current UI is smaller, it will fill the space to occupy the full height, or if the current UI is taller, a scroll will appear on the comments.
 - disableButtonPagination: hides the buttons for pagination.
 - login: Changes the login button to the user's pseudonym. Parameters: token, pseudonym, isAdmin.
 - logout: Changes the user's pseudonym with a login button.
 - getCurrentPseudonym: Reads the current pseudonym from the UI. **Important: this pseudonym is a truncated version (50 chars) of the original pseudonym.**
 - hideSignInLink: hide the sign in link. It is useful when the user is logged in logically, but doesn't have a pseudonym.
 - makeReadOnly: Makes the editor and submit button read only, useful when posting a commenting and waiting for the server's response.
 - makeEditable: Changes the read only state of the editor to editable.
 - addComment: Add new comment to the comment list. Parameters:
     + commentData:
         * id
         * content
         * timestamp
         * displayName
     + ownComment: if it is the user's own comment and the comment area has scroll, the comment area is scrolled to this comment.
     + adminMode: if true, delete button is added.
 - addNextPageComments: on pagination inserts a list of comments into the page.
 - removeComment: removes a comment from the comment list.
 - markCommentAsDeleteInProgress: fades out a comment while deleting is in progress.
 - markCommentAsDeleteInProgressEnded: opposite of the action above, restores the normal look of the comment.
 - getCurrentComment: returns the content of the editor.

###### collectionId
Livefyre's collection ID for the current article. **Populated only after the widget is loaded (`load` function)!**

###### timeout
Seconds after a timeout is considered when loading the widget.


### auth
This submodule is responsible for handling the user's authentication status.

##### Methods
###### login
This method tries to obtain authentication data about the user, and decides if the user is logged in or not.

Example:

```javascript
auth.login(function (loginStatus, authData) {
    if (loginStatus) {
        // make it visible in the UI
        ui.login(authData.token, authData.displayName, authData.moderator);
    } else {
        if (authData.pseudonym === false) {
            // the user doesn't have a pseudonym, but basically the user could be logged in.
            ui.hideSignInLink();
        }
    }
});
```

The login method should be provided with a callback parameter, which will get two paramters:
 - loginStatus: true if the user is logged in, false if isn't.
 - authData: authData 

###### logout
This method broadcasts a logout event to every module that are listening to it.

###### loginRequired
Using this method you can explicitly request an authenticated status. It handles different scenarios:

 - user already has authentication data, so it can be logged in
 - user has no pseudonym, ask for pseudonym
 - user has session expired, ask to log in again
 - user is not authenticated, ask to log in

Parameters:
 - callback: Optional. A function which will be called if the login succeded or failed. The parameters that it will get: err, authData. If the login process fails or it is refused by the user, the function is called with an error. If the login process ends successfully, callback is called with the authentication data: callback(null, {...}).
 - force: Optional. If true, the local cache is ignored and the web service is directly asked for the login status.

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
