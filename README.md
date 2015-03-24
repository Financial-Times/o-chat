# o-chat

A simple chat client integrated with FT's membership systems. If you simply wish to add a chat client to some content this is the component to use.

## Contents

* <a href="#prereq">Prerequisites</a>
* <a href="#product">Adding comments to your product</a>
 * <a href="#decl">Declaratively</a>
 * <a href="#imper">Imperatvely</a>
* <a href="#login">Login integration</a>
* <a href="#events">Events</a>
* <a href="#api">API</a>
    * <a href="#logging">Logging</a>
* <a href="#messages">Browser support</a>
* <a href="#core">Core/enhanced experience</a>
* <a href="#moderation">Moderation</a>

## <div id="prereq"></div> Prerequisites
* Your content must either be available in the Content API or available on a blogs URL in order for commenting to work. (See Moderation for why) 
* You must be on an FT.com domain or sub-domain for authentication to work

## <div id="product"></div> Adding chat to your product 


Javascript:

```javascript
var oChat = require('o-chat');
```

SCSS:

```css
@import 'o-chat/main';
```


### <div id="decl"></div> Declaratively 
Use the following markup to enable chat:

```html
<div class="o-chat" 
    id="{oChatInstance}" 
    data-o-chat-autoconstruct="true|false" 
    data-o-chat-config-title="{article-title}" 
    data-o-chat-config-url="{page-url}" 
    data-o-chat-config-articleId="{article-id}">
</div>
```

1. `{article-title}` the title of your article/post/thing
2. `data-o-chat-autoconstruct="true"` automatically construct the component when `o.DOMContentLoaded` fires. A `false` value (or omitting this attribute) allows you to defer component initialisation
3. `data-o-chat-config-articleId` a unique id for your content, ideally a UUID for FT content
4. `{page-url}` The canonical URL for your article/page/thing
5. `id` preferable to be set, but if missing it will be generated

If you defer initialising oChat by  using `data-o-chat-autoconstruct="false"` then you can initialise the component by calling

```javascript
oChat.initDomConstruct();
```

### <div id="imper"></div> Imperatively 
Create an instance of the component with the parameters that are available:

```javascript
var oChatComponent = new oChat.Widget({
    elId: 'container-id',
    title: document.title,
    url: document.location.href,
    articleId: 'article-id',
    initExtension: {
        datetimeFormat: {
            minutesUntilAbsoluteTime: -1,
            absoluteFormat: 'MMM dd hh:mm a'
        }
    }
});
```

Load the component:

```javascript
oChat.load();
```


#### More about the constructor of Widget
The configuration object which is passed to the contructor can/should have the following fields:

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
    
    Default value is 'side'.
 - datetimeFormat: How to format the timestamps. This is an object and has two fields:
    + minutesUntilAbsoluteTime: specifies after how many minutes to switch from relative time to absolute. If -1 is specified, the timestamps will be in the absolute format immediately. By default it is set to -1.
    + absoluteFormat: specifies the format with which the absolute timestamp is rendered. The default value `hh:mm a`. For more information about the possible values please visit: https://github.com/Financial-Times/o-date#o-dateformatdate-tpl


## <div id="login"></div> Login integration 
Users need to have a valid FT session in order to post comments. The default behavior for a user without a valid session is to redirect to the FT's login page (https://registration.ft.com). However you may wish to integrate with your product's authentication process for a slicker UX in which case you can override the default behaviour.

1. Override the `auth.loginRequiredDefaultBehavior` function

```javascript
oChat.auth.loginRequiredDefaultBehavior = function (evt) {
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

**Important: if the log in needs a page reload, don't call the failure function!**



## <div id="events"></div> Events 

All events have a payload of data to identify the originating component and any event specific data:

```javascript
{
    detail: {
        id: "idOfTheComponent",
        widget: componentInstance,
        data: {...} //data specific to the event
    }
}
```

##### oChat.widget.timeout
Triggered when loading the widget exceeded a given time.

##### oChat.error.resources
Triggered when the necessary resource files couldn't be loaded.
Event detail data: error object/message.

##### oChat.error.init
Error while loading the initialization data and the comments.
Event detail data: error object/message.

##### oChat.error.widget
Triggered when any error appear (triggered together with the above mentioned error events).
Event detail data: error object/message.

##### oChat.data.init
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

##### oChat.data.auth
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

##### oChat.widget.ready
The widget is ready to be rendered, the initialization process has finished.

##### oChat.widget.renderComplete
The UI is fully rendered.

##### oChat.tracking.postComment
A comment is posted.
Event detail data: (evt.detail.data)

```javascript
{
    collectionId: "119988167",
    comment: {
        author: {
            displayName: "roli second"
        },
        bodyHtml: "<p>test1533</p>",
        id: "286069596"
    }
}
```

##### oChat.tracking.deleteComment
A comment is deleted.
Event detail data: (evt.detail.data)

```javascript
{
    collectionId: "119988167",
    comment: {
        id: "286069596"
    }
}
```


#### Shared events
These events are triggered on the `body` element and are relevant to all oChat components on a page. They have the same format as the component level events: `oChat.nameOfTheEvent`, where `nameOfTheEvent` is one of the following below.

The payload data consists only of event specific data:

```javascript
{
    detail: {...} // event specific data
}
```

The events are the following:
##### oChat.auth.login
Triggered when a user is successfully logged in.
Payload is the jwt token with which the user is logged in.

##### oChat.auth.logout
Triggered when a user is logged out.

##### oChat.auth.loginRequired
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

## <div id="api"></div> API 

##### oChat.init(config)
This method is responsible for changing the default configuration used by oChat. Calling this method with an object will merge the default configuration with the object specified (deep merge, primitive type values of the same key will be overwritten).

##### Default configuration - PROD

```javascript
{
    "livefyre": {
        "network": "ft.fyre.co"
    }
}
```

##### Using the TEST environment
In order to change to the TEST environment, use the following code:

```javascript
oChat.init({
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
});
```

### Logging
Logging can be enabled for debugging purposes. It logs using the global 'console' if available (if not, nothing happens and it degrades gracefully).
By default logging is disabled.

##### oChat.enableLogging()
This method enables logging of the module.

##### oChat.disableLogging()
This method disables logging of the module.

##### oChat.setLoggingLevel(level)
This method sets the logging level. This could be a number from 0 to 4 (where 0 is debug, 4 is error), or a string from the available methods of 'console' (debug, log, info, warn, error).
Default is 3 (warn).

## <div id="browser"></div> Browser support 
Works in accordance with our [support policy](https://docs.google.com/a/ft.com/document/d/1dX92MPm9ZNY2jqFidWf_E6V4S6pLkydjcPmk5F989YI/edit)

## <div id="core"></div> Core/Enhanced Experience
Only the enhanced experience offers any kind of commenting functionality. Core functionality will be added in due course.

## <div id="moderation"></div> Moderation
All comments made on FT products are moderated. Moderation is important but expensive: So all comments are categorised so that different moderation teams can effectively manage the comments they have responsibility for.

This does add some complexity though, and it places some constraints on where comments can be used. There are 2 ways in which the categorisation happens: Using the URL of the page where the comments appear (used for blogs) or by looking up the Content API using the passed in UUID and using the returned metatdata. 

If you cannot meet either of these criteria commenting will simply not work. This is going to change though and in the future you will be able to explicitly define which team should moderate the comments generated on your page/article/story/thing.
