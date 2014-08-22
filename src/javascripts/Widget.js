//var ccsClient = require('o-ccs-client');
var auth = require('./auth.js');
var utils = require('./utils.js');
var messageQueue = require('./messageQueue.js');
var WidgetUi = require('./WidgetUi.js');
var commentUi = require('comment-ui');
var oCommentData = require('o-comment-data');
var commentUtilities = require('comment-utilities');
var userDialogs = require('./userDialogs.js');

/**
 * Incorporates the communication with the content creation service,
 * Livefyre authentication, live streaming, and creation of the markup
 * of the commenting widget.
 *
 * The Widget is configurable and customizable.
 * 
 *
 * #### Configuration:
 * ##### Mandatory fields:
 *  - elId: ID of the HTML element in which the widget should be loaded
 *  - articleId: ID of the article, any string
 *  - url: canonical URL of the page
 *  - title: Title of the page
 *     
 * #####Optional fields:
 *  - stream_type: livecomments, livechat, liveblog. By default it is livecomments.
 *  - authPageReload: if authentication needs a page reload. By default it's false.
 * 
 * @param {object} config Configuration object. See in the description the fields that are mandatory.
 */
var Widget = function () {
    "use strict";

    commentUi.Widget.apply(this, arguments);

    var self = this;

    this.config.order = this.config.order || "normal";
    this.getWidgetEl().className += ' o-comment-client comment-order-' + this.config.order;

    this.collectionId = null;
    this.datetimeFormat = {
        minutesUntilAbsoluteTime: 20160,
        absoluteFormat: 'date'
    };

    if (this.config.datetimeFormat) {
        if (typeof this.config.datetimeFormat === 'string') {
            this.datetimeFormat.absoluteFormat = this.config.datetimeFormat;
        } else if (typeof this.config.datetimeFormat === 'object') {
            if (this.config.datetimeFormat.hasOwnProperty('minutesUntilAbsoluteTime')) {
                this.datetimeFormat.minutesUntilAbsoluteTime = this.config.datetimeFormat.minutesUntilAbsoluteTime;
            }

            if (this.config.datetimeFormat.hasOwnProperty('absoluteFormat')) {
                this.datetimeFormat.absoluteFormat = this.config.datetimeFormat.absoluteFormat;
            }
        }
    }

    this.ui = new WidgetUi(this.getWidgetEl(), this.datetimeFormat);
    

    this.loadResources = function (callback) {
        callback();
    };

    this.init = function (callback) {
        oCommentData.api.getComments({
            articleId: self.config.articleId,
            url: self.config.url,
            title: self.config.title,
            stream: true
        }, function (err, data) {
            if (err) {
                callback(err);
                return;
            }

            if (data.hasOwnProperty('collection')) {
                callback(null, data.collection);
            } else if (data.hasOwnProperty('comment')) {
                console.log(data.comment);
            }
        });
    };

    this.render = function (commentsData, callback) {
        if (commentsData) {
            if (commentsData.unclassifiedArticle !== true) {
                self.collectionId = commentsData.collectionId;
                self.trigger('ready.widget');

                if (self.config.authPageReload === true && messageQueue.hasMessage(self.collectionId)) {
                    commentUtilities.logger.log("Force flag set.");

                    self.forceMode = true;
                }

                for (var index = 0; index < commentsData.comments.length; index++) {
                    commentsData.comments[index].dateToShow = self.ui.formatTimestamp(commentsData.comments[index].timestamp);
                    commentsData.comments[index].datetime = utils.date.toISOString(commentsData.comments[index].timestamp);
                    if (self.ui.isRelativeTime(commentsData.comments[index].timestamp)) {
                        commentsData.comments[index].relativeTime = true;
                    }
                }
                self.ui.render(commentsData.comments, self.config.order);

                callback();


                oCommentData.api.getAuth(function (err, authData) {
                    if (err) {
                        authData = null;
                    }

                    self.trigger('loaded.auth', authData);

                    if (self.config.authPageReload === true && (!authData || (!authData.token && authData.pseudonym !== false))) {
                        self.authPageReload = true;
                    }

                    if (authData && authData.token) {
                        auth.getInstance().login(authData.token, authData.displayName);
                    } else if (authData.pseudonym === false) {
                        auth.getInstance().pseudonymMissing = true;

                        if (self.forceMode === true) {
                            loginRequiredPseudonymMissing({
                                success: function () {},
                                failure: function () {
                                    messageQueue.clear(self.collectionId);
                                }
                            });
                        }

                        self.ui.hideSignInLink();
                    } else if (authData.serviceUp === false) {
                        self.ui.makeReadOnly();
                        self.ui.hideSignInLink();
                        self.ui.addAuthNotAvailableMessage();
                    }
                });
            } else {
                callback({
                    unclassifiedArticle: true
                });
            }
        }
    };


    function login () {
        self.ui.addSettingsLink({
            onClick: function () {
                oCommentData.api.getAuth(function (err, currentAuthData) {
                    var showSettingsDialog = function () {
                        userDialogs.showChangePseudonymDialog(currentAuthData.displayName, {
                            success: function (newAuthData) {
                                if (newAuthData && newAuthData.token) {
                                    self.ui.changePseudonym(newAuthData.displayName);
                                }
                            }
                        });
                    };

                    if (err || !currentAuthData) {
                        loginRequired({
                            success: function () {
                                showSettingsDialog();
                            }
                        });
                        return;
                    }

                    showSettingsDialog();
                });
            }
        });
    }

    function logout () {
        self.ui.logout();
        self.ui.removeSettingsLink();
    }


    auth.getInstance().on('login.auth', function (token, pseudonym) {
        self.ui.login(pseudonym);
        login();

        if (self.forceMode) {
            messageQueue.postComments(self.collectionId, function (commentBody) {
                self.trigger('commentPosted.tracking', [self.collectionId, {
                    bodyHtml: commentBody,
                    author: {
                        displayName: pseudonym
                    }
                }]);
            });
        }
    });

    auth.getInstance().on('logout.auth', function () {
        logout();
    });


    self.ui.on('signIn', function () {
        loginRequired();
    });


    function loginRequiredPseudonymMissing (delegate) {
        commentUtilities.logger.log('pseudonymMissing');

        userDialogs.showSetPseudonymDialog({
            success: function (authData) {
                if (authData && authData.token) {
                    auth.getInstance().login(authData.token, authData.displayName);
                }

                if (delegate && delegate.success) {
                    delegate.success();
                }
            },
            failure: function () {
                if (delegate && delegate.failure) {
                    delegate.failure();
                }
            }
        });
    }

    function loginRequiredAfterASuccess (delegate) {
        oCommentData.api.getAuth(function (err, authData) {
            if (authData && authData.pseudonym === false) {
                loginRequiredPseudonymMissing(delegate);
            } else {
                if (delegate && delegate.failure) {
                    delegate.failure();
                }
            }
        });
    }

    function loginRequired (delegate) {
        oCommentData.api.getAuth(function (err, authData) {
            if (authData && authData.pseudonym === false) {
                loginRequiredPseudonymMissing(delegate);
            } else if (!authData || !authData.token) {
                self.trigger('loginRequired.authAction', {
                    success: function () {
                        loginRequiredAfterASuccess(delegate);
                    },
                    failure: function () {
                        if (delegate && delegate.failure) {
                            delegate.failure();
                        }
                    }
                });
            }
        });
    }

    self.on('loginRequired.authAction', function () {
        commentUtilities.logger.log('loginRequired.authAction');
    });




    var postComment = function () {
        var id = 'inProgress-1234';

        var commentBody = self.ui.getCurrentComment();
        var authorPseudonym = self.ui.getCurrentPseudonym();

        self.ui.addComment(commentBody, authorPseudonym, id);
        self.ui.emptyCommentArea();

        oCommentData.api.postComment({
            collectionId: self.collectionId,
            commentBody: commentBody
        }, function (err, postCommentResult) {
            if (err) {
                commentUtilities.logger.debug('postComment error:', err);
                self.ui.removeComment(id);
                self.ui.repopulateCommentArea(commentBody);
                return;
            }

            commentUtilities.logger.debug('postComment result:', postCommentResult);

            if (postCommentResult && postCommentResult.success === true) {
                self.trigger('commentPosted.tracking', [self.collectionId, {
                    bodyHtml: commentBody,
                    author: {
                        displayName: authorPseudonym
                    }
                }]);
            } else {
                self.ui.removeComment(id);
                self.ui.repopulateCommentArea(commentBody);
                return;
            }
        });
    };

    self.ui.on('postComment', function () {
        commentUtilities.logger.debug('postComment', self.ui.getCurrentComment());

        var commentBody = self.ui.getCurrentComment();

        oCommentData.api.getAuth(function (err, authData) {
            if (!authData || !authData.token) {
                if (self.authPageReload === true) {
                    messageQueue.save(self.collectionId, commentBody);
                    commentUtilities.logger.log('authPageReload set, save comment to the storage');

                    loginRequired({
                        success: function () {

                        },
                        failure: function () {
                            messageQueue.clear(self.collectionId);
                        }
                    });
                } else {
                    loginRequired({
                        success: function () {
                            postComment();
                        },
                        failure: function () {
                        }
                    });
                }
            } else {
                postComment();
            }
        });
    });
};
commentUi.Widget.__extend(Widget);

Widget.__extend = function(child) {
    "use strict";

    if (typeof Object.create === 'function') {
        child.prototype = Object.create( Widget.prototype );
        child.prototype = Object.create(Widget.prototype);
    } else {
        var Tmp = function () {};
        Tmp.prototype = Widget.prototype;
        child.prototype = new Tmp();
        child.prototype.constructor = child;
    }
};

module.exports = Widget;