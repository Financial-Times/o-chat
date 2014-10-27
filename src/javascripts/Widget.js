"use strict";

var auth = require('./auth.js');
var MessageQueue = require('./MessageQueue.js');
var WidgetUi = require('./WidgetUi.js');
var oCommentUi = require('o-comment-ui');
var oCommentData = require('o-comment-data');
var oCommentUtilities = require('o-comment-utilities');
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
 *  - order: This specifies how the widget is built. It can have two values:
 *      + normal: the commenting box is placed on top of the comment stream, and the comments are ordered as newest on top.
 *      + inverted: the commenting box is placed at the bottom of the comment stream, and the comments are ordered newest on bottom.
 *      <br/>Default value is 'normal'.
 *  - layout: Specifies the layout style of the widget. It can have two values:
 *      + normal: When placed in the main area of the page.
 *      + side: When placed in the side area of the page.
 *      <br/>Default value is 'normal'.
 *  - datetimeFormat: How to format the timestamps. This is an object and has two fields:
 *      + minutesUntilAbsoluteTime: specifies after how many minutes to switch from relative time to absolute.
 *      If -1 is specified, the timestamps will be in the absolute format immediately.
 *      By default it is set to 14 days.
 *      + absoluteFormat: specifies the format with which the absolute timestamp is rendered.
 *      For more information about the possible values please visit:
 *      https://github.com/Financial-Times/o-date#o-dateformatdate-tpl
 * 
 * @param {object} config Configuration object. See in the description the fields that are mandatory.
 */
var Widget = function () {
    oCommentUi.Widget.apply(this, arguments);

    var self = this;

    this.config.order = this.config.order || "normal";

    // add appropriate classes to the widget container
    this.getWidgetEl().className += ' o-comment-client comment-order-' + this.config.order;

    /**
     * Collection ID.
     * @type {Number}
     */
    this.collectionId = null;

    /**
     * Message queue which is responsible to save comments when a page reload is needed
     * to authenticate (when posting a comment).
     * @type {[type]}
     */
    this.messageQueue = null;

    var defaultDatetimeFormat = {
        minutesUntilAbsoluteTime: 20160,
        absoluteFormat: 'date'
    };

    if (!this.config.datetimeFormat) {
        if (this.config.datetimeformat) {
            this.config.datetimeFormat = this.config.datetimeformat;
        }
    }

    // merge user date preferences with the default preferences
    if (this.config.datetimeFormat) {
        if (typeof this.config.datetimeFormat === 'string') {
            defaultDatetimeFormat.absoluteFormat = this.config.datetimeFormat;
        } else if (typeof this.config.datetimeFormat === 'object') {
            if (this.config.datetimeFormat.hasOwnProperty('minutesUntilAbsoluteTime')) {
                defaultDatetimeFormat.minutesUntilAbsoluteTime = this.config.datetimeFormat.minutesUntilAbsoluteTime;
            }

            if (this.config.datetimeFormat.hasOwnProperty('absoluteFormat')) {
                defaultDatetimeFormat.absoluteFormat = this.config.datetimeFormat.absoluteFormat;
            }
        }
    }
    this.config.datetimeFormat = defaultDatetimeFormat;

    var nextPageNumber;
    var isMorePageAvailable = false;
    var nextPageFetchInProgress = false;
    var loginStatus = false;
    var userIsAdmin = false;

    var commentIds = [];

    /**
     * Comment IDs are saved to avoid duplicates. This returns if an ID already exists.
     * @param  {Number}  id ID of a comment.
     * @return {Boolean}
     */
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

    /**
     * Removes a comment ID from the list of existing comments IDs.
     * @param  {Number} id ID of a comment.
     * @return {Boolean}
     */
    var removeCommentId = function (id) {
        var index;
        if (Array.prototype.indexOf) {
            index = commentIds.indexOf(id);
            if (index !== -1) {
                commentIds.splice(index, 1);
                return true;
            }
            return false;
        } else {
             for (index = 0; index < commentIds.length; index++) {
                if (commentIds[index] === id) {
                    commentIds.splice(index, 1);
                    return true;
                }
             }
             return false;
        }
    };

    /**
     * Instance of WidgetUi. This can handle the UI part of the widget.
     * @type {WidgetUi}
     */
    this.ui = new WidgetUi(this.getWidgetEl(), {
        datetimeFormat: this.config.datetimeFormat,
        orderType: self.config.order
    });
    
    /**
     * Does nothing, but it is a mandatory override of oCommentUi.Widget.
     * @param  {Function} callback
     */
    this.loadResources = function (callback) {
        callback();
    };

    /**
     * Override of oCommentUi.Widget.init function.
     * This is responsible to load the comments and the article related data.
     * This function also initiates live stream from Livefyre.
     * 
     * @param  {Function} callback function(err, data), where data contains collectionId and comments. See o-comment-data.api.getComments
     */
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
                
                if (typeof data.collection.nextPage === 'number') {
                    nextPageNumber = data.collection.nextPage;
                    isMorePageAvailable = true;
                } else {
                    isMorePageAvailable = false;
                }
                
                callback(null, data.collection);
            } else if (data.hasOwnProperty('comment')) {
                // streaming info
                if (data.comment.deleted === true) {
                    // comment deleted
                    commentDeleted(data.comment.commentId);
                } else {
                    // new comment
                    newCommentReceived(data.comment);
                }
            }
        });
    };

    /**
     * Decides what happens when an error occurs. It clears the container.
     * If the article is flagged as unclassified, no message appears.
     * If any other error occurs, show a generic not available message.
     * @param  {Object|String} err Error object or string.
     */
    this.onError = function (err) {
        self.ui.clearContainer();

        if (typeof err !== 'object' || !err || err.unclassifiedArticle !== true) {
            self.ui.addNotAvailableMessage();
        }
    };

    /**
     * Handle the comments, render them, and initiate the login process as well.
     * @param  {Object}   commentsData Object with collectionId and comments.
     * @param  {Function} callback     Called when the initial rendering completed.
     */
    this.render = function (commentsData, callback) {
        if (commentsData) {
            if (commentsData.unclassifiedArticle !== true) {
                self.collectionId = commentsData.collectionId;
                self.messageQueue = new MessageQueue(self.collectionId);
                self.trigger('ready.widget');

                auth.login(function (loggedIn, authData) {
                    if (!authData) {
                        authData = null;
                    }

                    self.trigger('loaded.auth', authData);

                    if (authData) {
                        if (authData.admin || authData.moderator) {
                            userIsAdmin = true;
                        }
                    }

                    // normalize the comments data
                    commentsData.comments = preprocessCommentData(commentsData.comments);

                    // render the widget in the DOM
                    self.ui.render(commentsData.comments, userIsAdmin, isMorePageAvailable);

                    // all fine, no errors with the rendering
                    callback();
                    self.trigger('renderComplete.widget');

                    // determine if there are messages to post before being logged in.
                    // in this case a flag is set and the user is forced to finish the login process (e.g. no pseudonym)
                    if (self.messageQueue.hasComment()) {
                        oCommentUtilities.logger.log("Force flag set.");

                        self.forceMode = true;
                    }

                    if (!loggedIn) {
                        if (authData) {
                            if (authData.pseudonym === false) {
                                // the user is forced to finish the login process
                                // ask to set a pseudonym instantly
                                if (self.forceMode === true) {
                                    auth.loginRequiredPseudonymMissing({
                                        success: function () {},
                                        failure: function () {
                                            var messageInTheQueue = self.messageQueue.getComment();
                                            self.ui.repopulateCommentArea(messageInTheQueue);
                                            self.messageQueue.clear();
                                        }
                                    });
                                }

                                self.ui.hideSignInLink();
                            } else if (authData.serviceUp === false) {
                                self.ui.makeReadOnly();
                                self.ui.hideSignInLink();
                            }
                        } else if (self.forceMode === true) {
                            var messageInTheQueue = self.messageQueue.getComment();
                            self.ui.repopulateCommentArea(messageInTheQueue);
                            self.messageQueue.clear();
                        }
                    }
                });
            } else {
                callback({
                    unclassifiedArticle: true
                });
            }
        }
    };

    /**
     * Calling this method with a height in pixels as parameter will adapt the UI
     * to shrink within that height. If the current UI is smaller, it will fill the
     * space to occupy the full height, or if the current UI is taller, a scroll
     * will appear on the comments.
     * 
     * @param  {Number} height Desired height in pixels.
     */
    this.adaptToHeight = function (height) {
        if (height) {
            self.ui.adaptToHeight(height);
        }
    };

    if (self.config.height) {
        this.adaptToHeight(self.config.height);
    }

    /**
     * Adds the following parameters to an existing comment object:
     * 
     *  - dateToShow: date in the format that is rendered in the UI
     *  - datetime: date in ISO format
     *  - relativeTime: if dateToShow is in relative time format
     *  - timestamp: normalized timestamp (in milliseconds)
     *  - author.displayName truncated to 50 characters
     *  
     * @param  {Object} aComment A comment object, which respects the format the oCommentData.api.getComments returns.
     * @return {Object}
     */
    function processOneComment (aComment) {
        aComment.dateToShow = self.ui.formatTimestamp(aComment.timestamp);
        aComment.datetime = oCommentUtilities.dateHelper.toISOString(aComment.timestamp);
        if (self.ui.isRelativeTime(aComment.timestamp)) {
            aComment.relativeTime = true;
        }
        aComment.timestamp = oCommentUtilities.dateHelper.toTimestamp(aComment.timestamp);
        aComment.author.displayName = aComment.author.displayName.substring(0, 50);

        return aComment;
    }

    /**
     * Iterates over an array of comments and applies the modifications made by the
     * processOneComment function.
     * 
     * @param  {Array} comments Array with comments objects, which respects the format the oCommentData.api.getComments returns.
     * @return {Array}
     */
    function preprocessCommentData (comments) {
        if (comments) {
            if (typeof comments.length === 'number') {
                for (var index = 0; index < comments.length; index++) {
                    comments[index] = processOneComment(comments[index]);
                }

                return comments;
            } else {
                return processOneComment(comments);
            }
        }

        return comments;
    }

    /**
     * New comment received over the stream, this function handles it.
     * @param  {Object} commentData A comment object, in Livefyre format.
     */
    function newCommentReceived (commentData) {
        if (!hasCommentId(commentData.commentId)) {
            commentIds.push(commentData.commentId);
            self.ui.addComment({
                id: commentData.commentId,
                content: commentData.content,
                timestamp: commentData.timestamp,
                displayName: commentData.author.displayName
            }, (commentData.author.displayName.substring(0, 50) === self.ui.getCurrentPseudonym()), userIsAdmin);
        }
    }

    function commentDeleted (commentId) {
        removeCommentId(commentId);
        self.ui.removeComment(commentId);
    }


    function login (authData) {
        loginStatus = true;

        self.ui.login(authData.token, authData.displayName, authData.admin || authData.moderator);
        self.ui.addSettingsLink({
            onClick: function () {
                var showSettingsDialog = function () {
                    oCommentData.api.getAuth(function (err, currentAuthData) {
                        if (!err && currentAuthData) {
                            userDialogs.showChangePseudonymDialog(currentAuthData.displayName, {
                                success: function (newAuthData) {
                                    if (newAuthData && newAuthData.token) {
                                        auth.logout();
                                        auth.login();
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
            self.messageQueue.postComment(function (commentInfo) {
                commentIds.push(commentInfo.commentId);

                self.ui.addComment({
                    id: commentInfo.commentId,
                    content: commentInfo.commentBody,
                    timestamp: commentInfo.createdAt,
                    displayName: authData.displayName
                }, true, authData.admin || authData.moderator);

                triggerCommentPostedEvent({
                    commentId: commentInfo.commentId,
                    commentBody: commentInfo.commentBody,
                    author: {
                        displayName: authData.displayName
                    }
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
            oCommentUtilities.logger.log('fetch next page');

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

                if (typeof data.collection.nextPage === 'number') {
                    nextPageNumber = data.collection.nextPage;
                } else {
                    isMorePageAvailable = false;
                    self.ui.disableButtonPagination();
                }

                self.ui.addNextPageComments(preprocessCommentData(data.collection.comments), userIsAdmin);

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
                displayName: commentInfo.author.displayName
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

        oCommentData.api.postComment({
            collectionId: self.collectionId,
            commentBody: commentBody
        }, function (err, postCommentResult) {
            self.ui.makeEditable();

            if (err) {
                oCommentUtilities.logger.debug('postComment error:', err);

                self.ui.setEditorError(oCommentUi.i18n.texts.genericError);

                return;
            }

            oCommentUtilities.logger.debug('postComment result:', postCommentResult);

            if (postCommentResult) {
                if (postCommentResult.success === true) {
                    self.ui.emptyCommentArea();

                    oCommentData.api.getAuth(function (err, authData) {
                        if (authData) {
                            triggerCommentPostedEvent({
                                commentId: postCommentResult.commentId,
                                commentBody: postCommentResult.bodyHtml,
                                author: {
                                    displayName: authData.displayName
                                }
                            });

                            if (!hasCommentId(postCommentResult.commentId)) {
                                commentIds.push(postCommentResult.commentId);
                                self.ui.addComment({
                                    id: postCommentResult.commentId,
                                    content: postCommentResult.bodyHtml,
                                    timestamp: postCommentResult.createdAt,
                                    displayName: authData.displayName
                                }, true, userIsAdmin);
                            }
                        }
                    });
                } else if (postCommentResult.invalidSession === true && secondStepOfTryingToPost !== true) {
                    loginRequiredToPostComment(commentBody, true);
                } else {
                    if (postCommentResult.errorMessage) {
                        self.ui.setEditorError(postCommentResult.errorMessage);
                    } else {
                        self.ui.setEditorError(oCommentUi.i18n.texts.genericError);
                    }

                    return;
                }
            } else {
                self.ui.setEditorError(oCommentUi.i18n.texts.genericError);
            }
        });
    };


    function loginRequiredToPostComment (commentBody, secondStepOfTryingToPost) {
        self.messageQueue.save(commentBody);
        oCommentUtilities.logger.log('user not actively logged in, save comment to the storage');

        var force = false;
        if (secondStepOfTryingToPost) {
            force = true;
        }

        auth.loginRequired({
            success: function () {
                self.messageQueue.clear();
                postComment(commentBody, secondStepOfTryingToPost);
            },
            failure: function () {
                self.messageQueue.clear();
            }
        }, force);
    }

    // the 'Submit comment' button is pressed
    self.ui.on('postComment', function () {
        var commentBody = self.ui.getCurrentComment();

        oCommentUtilities.logger.debug('postComment', 'comment: "'+ commentBody +'"');
        
        if (!commentBody) {
            self.ui.setEditorError(i18n.errors.emptyComment);
            return;
        }

        self.ui.makeReadOnly();

        oCommentData.api.getAuth(function (err, authData) {
            if (!authData || !authData.token) {
                self.ui.makeEditable();
                loginRequiredToPostComment(commentBody);
            } else {
                if (!loginStatus) {
                    auth.login();
                }
                postComment(commentBody);
            }
        });
    });





    function deleteComment (commentId, secondStepOfTryingToDelete) {
        oCommentData.api.deleteComment({
            collectionId: self.collectionId,
            commentId: commentId
        }, function (err, deleteCommentResult) {
            if (err) {
                userDialogs.showMessage("Delete comment", oCommentUi.i18n.texts.genericError);
                oCommentUtilities.logger.log("delete comment call error: ", err);
                return;
            }

            if (deleteCommentResult) {
                if (deleteCommentResult.success === true) {
                    self.ui.removeComment(commentId);
                    self.trigger('commentDeleted.tracking', [self.collectionId, {
                        id: commentId
                    }]);
                } else if (deleteCommentResult.invalidSession === true && secondStepOfTryingToDelete !== true) {
                    loginRequiredToDeleteComment(commentId, true);
                } else {
                    self.ui.markCommentAsDeleteInProgressEnded(commentId);

                    if (deleteCommentResult.errorMessage) {
                        var match;
                        var errMsg = deleteCommentResult.errorMessage;

                        for (var msgToOverride in oCommentUi.i18n.serviceMessageOverrides) {
                            if (oCommentUi.i18n.serviceMessageOverrides.hasOwnProperty(msgToOverride)) {
                                match = deleteCommentResult.errorMessage.match(new RegExp(msgToOverride));
                                if (match && match.length) {
                                    errMsg = oCommentUi.i18n.serviceMessageOverrides[msgToOverride];
                                }
                            }
                        }
                         
                        userDialogs.showMessage("Delete comment", errMsg);
                    } else {
                        userDialogs.showMessage("Delete comment", oCommentUi.i18n.texts.genericError);
                    }

                    return;
                }
            } else {
                self.ui.markCommentAsDeleteInProgressEnded(commentId);

                userDialogs.showMessage("Delete comment", oCommentUi.i18n.texts.genericError);
            }
        });
    }

    function loginRequiredToDeleteComment (commentId, secondStepOfTryingToDelete) {
        var force = false;
        if (secondStepOfTryingToDelete) {
            force = true;
        }

        auth.loginRequired({
            success: function () {
                deleteComment(commentId, secondStepOfTryingToDelete);
            },
            failure: function () {
                self.ui.markCommentAsDeleteInProgressEnded(commentId);
            }
        }, force);
    }

    self.ui.on('deleteComment', function (commentId) {
        self.ui.markCommentAsDeleteInProgress(commentId);

        oCommentData.api.getAuth(function (err, authData) {
            if (!authData || !authData.token) {
                loginRequiredToDeleteComment(commentId);
            } else {
                if (!loginStatus) {
                    auth.login();
                }
                deleteComment(commentId);
            }
        });
    });
};
oCommentUi.Widget.__extend(Widget);

Widget.__extend = function(child) {
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
