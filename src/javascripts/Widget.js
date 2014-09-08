var auth = require('./auth.js');
var utils = require('./utils.js');
var messageQueue = require('./messageQueue.js');
var WidgetUi = require('./WidgetUi.js');
var commentUi = require('comment-ui');
var oCommentData = require('o-comment-data');
var commentUtilities = require('comment-utilities');
var userDialogs = require('./userDialogs.js');
var i18n = require('./i18n.js');

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
 * ##### Optional fields:
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

    var currentPageNumber;
    var nextPageNumber;
    var isMorePageAvailable = false;
    var nextPageFetchInProgress = false;


    var loginStatus = false;

    var commentIds = [];
    var hasCommentId = function (id) {
        if (Array.prototype.indexOf) {
            return commentIds.indexOf(id) !== -1 ? true : false;
        } else {
             for (var i = 0; i < commentIds.length; i++) {
                if (commentIds[i] === id) {
                    return true;
                }
             }
             return false;
        }
    };

    // merge user date preferences with the default preferences
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

    this.ui = new WidgetUi(this.getWidgetEl(), {
        datetimeFormat: this.datetimeFormat,
        orderType: self.config.order
    });
    

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
                // initial collection info
                
                if (data.collection.pageInfo) {
                    if (typeof data.collection.pageInfo.currentPage === 'number') {
                        currentPageNumber = data.collection.pageInfo.currentPage;
                    }

                    if (typeof data.collection.pageInfo.nextPage === 'number') {
                        nextPageNumber = data.collection.pageInfo.nextPage;
                        isMorePageAvailable = true;
                    } else {
                        isMorePageAvailable = false;
                    }
                }
                
                callback(null, data.collection);
            } else if (data.hasOwnProperty('comment')) {
                // comment received through streaming

                newCommentReceived(data.comment);
            }
        });
    };

    this.render = function (commentsData, callback) {
        if (commentsData) {
            if (commentsData.unclassifiedArticle !== true) {
                self.collectionId = commentsData.collectionId;
                self.trigger('ready.widget');

                // normalize the comments data
                commentsData.comments = preprocessCommentData(commentsData.comments);

                // render the widget in the DOM
                self.ui.render(commentsData.comments);

                // all fine, no errors with the rendering
                callback();
                self.trigger('renderComplete.widget');

                // determine if there are messages to post before being logged in.
                // in this case a flag is set and the user is forced to finish the login process (e.g. no pseudonym)
                if (messageQueue.hasComment(self.collectionId)) {
                    commentUtilities.logger.log("Force flag set.");

                    self.forceMode = true;
                }


                oCommentData.api.getAuth(function (err, authData) {
                    if (err) {
                        authData = null;
                    }

                    self.trigger('loaded.auth', authData);

                    if (authData) {
                        if (authData.token) {
                            // user has a token, login
                            auth.login(authData.token, authData.displayName);
                        } else if (authData.pseudonym === false) {
                            // the user doesn't have pseudonym

                            auth.pseudonymMissing = true;

                            // the user is forced to finisht the login process
                            // ask to set a pseudonym instantly
                            if (self.forceMode === true) {
                                auth.loginRequiredPseudonymMissing({
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
                        }
                    } else if (self.forceMode === true) {
                        var messageInTheQueue = messageQueue.getComment(self.collectionId);
                        self.ui.repopulateCommentArea(messageInTheQueue);
                    }
                });
            } else {
                callback({
                    unclassifiedArticle: true
                });
            }
        }
    };

    this.adaptToHeight = function (height) {
        if (height) {
            self.ui.adaptToHeight(height);
        }
    };


    function processOneComment (aComment) {
        aComment.dateToShow = self.ui.formatTimestamp(aComment.timestamp);
        aComment.datetime = utils.date.toISOString(aComment.timestamp);
        if (self.ui.isRelativeTime(aComment.timestamp)) {
            aComment.relativeTime = true;
        }
        aComment.timestamp = utils.date.toTimestamp(aComment.timestamp);

        return aComment;
    }
    function preprocessCommentData (comments) {
        if (comments.length) {
            for (var index = 0; index < comments.length; index++) {
                comments[index] = processOneComment(comments[index]);
            }

            return comments;
        } else {
            return processOneComment(comments);
        }
    }


    function newCommentReceived (commentData) {
        if (!hasCommentId(commentData.commentId)) {
            commentIds.push(commentData.commentId);
            self.ui.addComment({
                id: commentData.commentId,
                content: commentData.content,
                timestamp: commentData.timestamp,
                displayName: commentData.author.displayName
            }, (commentData.author.displayName === self.ui.getCurrentPseudonym()));
        }
    }


    function login (token, pseudonym, isAdmin) {
        loginStatus = true;

        self.ui.login(token, pseudonym, isAdmin);
        self.ui.addSettingsLink({
            onClick: function () {
                var showSettingsDialog = function () {
                    oCommentData.api.getAuth(function (err, currentAuthData) {
                        if (!err && currentAuthData) {
                            userDialogs.showChangePseudonymDialog(currentAuthData.displayName, {
                                success: function (newAuthData) {
                                    if (newAuthData && newAuthData.token) {
                                        self.ui.changeUserDetails(newAuthData.token, newAuthData.displayName);
                                    }
                                }
                            });
                        }
                    });
                };

                oCommentData.api.getAuth(function (err, currentAuthData) {
                    if (err || !currentAuthData) {
                        auth.loginRequired({
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


        // after login, post the comments from the message queue
        if (self.forceMode) {
            messageQueue.postComment(self.collectionId, function (commentInfo) {
                commentIds.push(commentInfo.commentId);

                triggerCommentPostedEvent({
                    commentId: commentInfo.commentId,
                    commentBody: commentInfo.commentBody,
                    author: pseudonym
                });
            });
        }
    }
    auth.on('login.auth', login);

    function logout () {
        loginStatus = false;
        self.ui.logout();
        self.ui.removeSettingsLink();
    }
    auth.on('logout.auth', logout);



    // sign in button pressed
    self.ui.on('signIn', function () {
        auth.loginRequired();
    });

    self.ui.on('nextPage', function () {
        if (isMorePageAvailable && !nextPageFetchInProgress) {
            // fetch next page
            commentUtilities.logger.log('fetch next page');

            nextPageFetchInProgress = true;
            oCommentData.api.getComments({
                articleId: self.config.articleId,
                url: self.config.url,
                title: self.config.title,
                page: nextPageNumber
            }, function (err, data) {
                if (err) {
                    isMorePageAvailable = false;
                    self.ui.disableButtonPagination();
                    return;
                }

                if (data.collection.pageInfo) {
                    if (typeof data.collection.pageInfo.currentPage === 'number') {
                        currentPageNumber = data.collection.pageInfo.currentPage;
                    }

                    if (typeof data.collection.pageInfo.nextPage === 'number') {
                        nextPageNumber = data.collection.pageInfo.nextPage;
                    } else {
                        isMorePageAvailable = false;
                        self.ui.disableButtonPagination();
                    }
                }

                self.ui.addNextPageComments(preprocessCommentData(data.collection.comments));

                // wait until the DOM rendering has finished
                setTimeout(function () {
                    nextPageFetchInProgress = false;
                }, 200);
            });
        }
    });

    function triggerCommentPostedEvent (commentInfo) {
        self.trigger('commentPosted.tracking', [self.collectionId, {
            bodyHtml: commentInfo.commentBody,
            id: commentInfo.commentId,
            author: {
                displayName: commentInfo.author
            }
        }]);
    }

    /**
     * Post a comment.
     * Known fact is that the user is logged in and the comment body is not blank.
     *
     * Insert the comment in the DOM instantly, and try to post the comment with the API.
     * If successful, leave the comment in the DOM and change the ID with the real comment ID.
     * If unsuccessful, remove the comment from the DOM, repopulate the comment area with the comment and show the error message.
     * @return {[type]} [description]
     */
    var postComment = function (secondStepOfTryingToPost) {
        var commentBody = self.ui.getCurrentComment();
        var authorPseudonym = self.ui.getCurrentPseudonym();

        oCommentData.api.postComment({
            collectionId: self.collectionId,
            commentBody: commentBody
        }, function (err, postCommentResult) {
            self.ui.makeEditable();

            if (err) {
                commentUtilities.logger.debug('postComment error:', err);

                self.ui.setEditorError(commentUi.i18n.texts.genericError);

                return;
            }

            commentUtilities.logger.debug('postComment result:', postCommentResult);

            if (postCommentResult) {
                if (postCommentResult.success === true) {
                    self.ui.emptyCommentArea();

                    triggerCommentPostedEvent({
                        commentId: postCommentResult.commentId,
                        commentBody: postCommentResult.bodyHtml,
                        author: authorPseudonym
                    });

                    if (!hasCommentId(postCommentResult.commentId)) {
                        commentIds.push(postCommentResult.commentId);
                        self.ui.addComment({
                            id: postCommentResult.commentId,
                            content: postCommentResult.bodyHtml,
                            timestamp: postCommentResult.createdAt,
                            displayName: authorPseudonym
                        }, true);
                    }
                } else if (postCommentResult.invalidSession === true && secondStepOfTryingToPost !== true) {
                    loginRequiredToPostComment(true);
                } else {
                    if (postCommentResult.errorMessage) {
                        self.ui.setEditorError(postCommentResult.errorMessage);
                    } else {
                        self.ui.setEditorError(commentUi.i18n.texts.genericError);
                    }

                    return;
                }
            } else {
                self.ui.setEditorError(commentUi.i18n.texts.genericError);
            }
        });
    };


    function loginRequiredToPostComment (secondStepOfTryingToPost) {
        var commentBody = self.ui.getCurrentComment();

        messageQueue.save(self.collectionId, commentBody);
            commentUtilities.logger.log('user not actively logged in, save comment to the storage');

            auth.loginRequired({
                success: function () {
                    messageQueue.clear(self.collectionId);
                    postComment(secondStepOfTryingToPost);
                },
                failure: function () {
                    messageQueue.clear(self.collectionId);
                }
            });
    }

    // the 'Submit comment' button is pressed
    self.ui.on('postComment', function () {
        var commentBody = self.ui.getCurrentComment();

        commentUtilities.logger.debug('postComment', 'comment: "'+ commentBody +'"');
        
        if (!commentBody) {
            self.ui.setEditorError(i18n.errors.emptyComment);
            return;
        }

        self.ui.makeReadOnly();

        oCommentData.api.getAuth(function (err, authData) {
            if (!authData || !authData.token) {
                self.ui.makeEditable();
                loginRequiredToPostComment();
            } else {
                if (!loginStatus) {
                    auth.login(authData.token, authData.displayName);
                }
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