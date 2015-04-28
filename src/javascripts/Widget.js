"use strict";

var auth = require('./auth.js');
var MessageQueue = require('./MessageQueue.js');
var WidgetUi = require('./WidgetUi.js');
var oCommentUi = require('o-comment-ui');
var oCommentApi = require('o-comment-api');
var oCommentUtilities = require('o-comment-utilities');
var userDialogs = require('./userDialogs.js');
var i18n = require('./i18n.js');
var globalEvents = require('./globalEvents.js');

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
 *  - section: Override the default mapping based on URL or CAPI with an explicit mapping. Section parameter should be a valid FT metadata term (Primary section)
 *  - tags: Tags which will be added to the collection in Livefyre
 *
 * @param {object} config Configuration object. See in the description the fields that are mandatory.
 */
var Widget = function () {
	oCommentUi.Widget.apply(this, arguments);

	var self = this;

	this.config.order = this.config.order || "inverted";
	this.config.layout = this.config.layout || 'side';


	// add appropriate classes to the widget container
	if (this.getWidgetEl().className.indexOf('o-chat') === -1) {
		this.getWidgetEl().className += ' o-chat';
	}
	this.getWidgetEl().className += ' o-chat--order-' + this.config.order;
	this.getWidgetEl().setAttribute('data-o-chat-built', 'true');

	if (this.config.layout) {
		this.getWidgetEl().className += ' o-chat--comment-layout-' + this.config.layout;
	}

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
		minutesUntilAbsoluteTime: -1,
		absoluteFormat: 'hh:mm a'
	};

	this.config.datetimeFormat = defaultDatetimeFormat;

	if (!this.config.datetimeFormat) {
		if (!this.config.datetimeformat) {
			if (this.config.minutesuntilabsolutetime) {
				this.config.datetimeFormat.minutesUntilAbsoluteTime = this.config.minutesuntilabsolutetime;
			}

			if (this.config.absoluteformat) {
				this.config.datetimeFormat.absoluteFormat = this.config.absoluteformat;
			}
		} else {
			this.config.datetimeFormat = this.config.datetimeformat;
		}
	} else {
		// merge user date preferences with the default preferences
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

		this.config.datetimeFormat = defaultDatetimeFormat;
	}

	var nextPageNumber;
	var isMorePageAvailable = false;
	var nextPageFetchInProgress = false;
	var loginStatus = false;
	var userIsAdmin = false;
	var renderComplete = false;

	var lastBannedCommentId;
	var lastPendingCommentId;
	var lastOwnCommentId;

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
	 * @param  {Function} callback function(err, data), where data contains collectionId and comments. See o-comment-api.api.getComments
	 */
	this.loadInitData = function (callback) {
		var config = {
			title: self.config.title,
			url: self.config.url,
			articleId: self.config.articleId,
			stream: true
		};
		if (typeof self.config.section !== 'undefined') {
			config.section = self.config.section;
		}
		if (typeof self.config.tags !== 'undefined') {
			config.tags = self.config.tags;
		}

		self.config.stream = true;

		oCommentApi.api.getComments(config, function (err, data) {
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
			} else if (data.hasOwnProperty('stream')) {
				// streaming info
				if (renderComplete) {
					handleStream(data.stream);
				} else {
					self.on('widget.renderComplete', function () {
						handleStream(data.stream);
					});
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
				self.trigger('widget.ready');

				auth.login(function (loggedIn, authData) {
					if (!authData) {
						authData = null;
					}

					self.trigger('data.auth', authData);

					if (authData) {
						if (authData.admin || authData.moderator) {
							userIsAdmin = true;
						}
					}

					// normalize the comments data
					commentsData.comments = preprocessCommentData(commentsData.comments);

					// clear container
					self.ui.clearContainer();
					// render the widget in the DOM
					self.ui.render(commentsData.comments, userIsAdmin, isMorePageAvailable);

					// all fine, no errors with the rendering
					callback();
					self.trigger('widget.renderComplete');
					renderComplete = true;

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
									auth.loginRequiredPseudonymMissing(function (err, newAuthData) {
										if (err) {
											return;
										}

										var messageInTheQueue = self.messageQueue.getComment();
										self.ui.repopulateCommentArea(messageInTheQueue);
										self.messageQueue.clear();
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
	 * @param  {Object} aComment A comment object, which respects the format the oCommentApi.api.getComments returns.
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

		if (!hasCommentId(aComment.commentId)) {
			commentIds.push(aComment.commentId);
		}

		return aComment;
	}

	/**
	 * Iterates over an array of comments and applies the modifications made by the
	 * processOneComment function.
	 *
	 * @param  {Array} comments Array with comments objects, which respects the format the oCommentApi.api.getComments returns.
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
		if (!hasCommentId(commentData.commentId) && commentData.visibility === 1) {
			commentIds.push(commentData.commentId);
			self.ui.addComment({
				id: commentData.commentId,
				content: commentData.content,
				timestamp: commentData.timestamp,
				displayName: commentData.author.displayName
			}, (commentData.author.displayName.substring(0, 50) === self.ui.getCurrentPseudonym()), userIsAdmin);
		}

		handleStreamEventForBadgingComments(commentData);
	}

	function commentDeleted (commentId) {
		removeCommentId(commentId);
		self.ui.removeComment(commentId);
	}

	function commentUpdated (comment) {
		self.ui.updateComment(comment.commentId, comment.content);
	}


	function handleStream (streamData) {
		if (streamData.comment) {
			// comment related
			if (streamData.comment.deleted === true) {
				// comment deleted
				commentDeleted(streamData.comment.commentId);
			} else if (streamData.comment.updated === true) {
				commentUpdated({
					commentId: streamData.comment.commentId,
					content: streamData.comment.content
				});
			} else if (streamData.comment.commentId) {
				// new comment
				newCommentReceived(streamData.comment);
			}
		}

		if (streamData.collection) {
			// collection related

			if (streamData.collection.hasOwnProperty('commentsEnabled')) {
				if (streamData.collection.commentsEnabled === false) {
					self.ui.close();
				} else if (streamData.collection.commentsEnabled === true) {
					self.ui.open();
				}
			}
		}
	}


	function login (evt) {
		loginStatus = true;
		var authData = evt.detail;

		self.ui.login(authData.token, authData.displayName, authData.admin || authData.moderator);
		self.ui.addSettingsLink({
			onClick: function () {
				var showSettingsDialog = function () {
					oCommentApi.api.getAuth(function (authErr, currentAuthData) {
						if (!authErr && currentAuthData) {
							userDialogs.showChangePseudonymDialog(currentAuthData.displayName, function (err, newAuthData) {
								if (err) {
									return;
								}

								if (newAuthData && newAuthData.token) {
									auth.logout();
									auth.login();
								}
							});
						}
					});
				};

				auth.loginRequired(function (err, authData) {
					if (err) {
						return;
					}

					showSettingsDialog();
				});
			}
		});


		// after login, post the comments from the message queue
		if (self.forceMode && self.messageQueue.hasComment()) {
			var messageInTheQueue = self.messageQueue.getComment();
			self.messageQueue.clear();

			self.ui.repopulateCommentArea(messageInTheQueue);
			postComment(messageInTheQueue);
		}
	}
	globalEvents.on('auth.login', login);

	function logout () {
		loginStatus = false;
		self.ui.logout();
		self.ui.removeSettingsLink();
	}
	globalEvents.on('auth.logout', logout);



	// sign in button pressed
	self.ui.on('signIn', function () {
		auth.loginRequired();
	});

	self.ui.on('nextPage', function () {
		if (isMorePageAvailable && !nextPageFetchInProgress) {
			// fetch next page
			oCommentUtilities.logger.log('fetch next page');

			nextPageFetchInProgress = true;

			var config = {
				title: self.config.title,
				url: self.config.url,
				articleId: self.config.articleId,
				page: nextPageNumber
			};
			if (typeof self.config.section !== 'undefined') {
				config.section = self.config.section;
			}
			if (typeof self.config.tags !== 'undefined') {
				config.tags = self.config.tags;
			}

			oCommentApi.api.getComments(config, function (err, data) {
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
		self.trigger('tracking.postComment', {
			collectionId: self.collectionId,
			comment: {
				bodyHtml: commentInfo.commentBody,
				id: commentInfo.commentId,
				author: {
					displayName: commentInfo.author.displayName
				}
			}
		});
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
	var postComment = function (commentBody, secondStepOfTryingToPost) {
		oCommentApi.api.postComment({
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

					oCommentApi.api.getAuth(function (authErr, authData) {
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

							handleNewCommentForBadgingComments(postCommentResult);
						}
					});
				} else if (postCommentResult.invalidSession === true && secondStepOfTryingToPost !== true) {
					loginRequiredToPostComment(commentBody, true);
				} else {
					if (postCommentResult.errorMessage) {
						var match;
						var errMsg = postCommentResult.errorMessage;

						for (var msgToOverride in oCommentUi.i18n.serviceMessageOverrides) {
							if (oCommentUi.i18n.serviceMessageOverrides.hasOwnProperty(msgToOverride)) {
								match = postCommentResult.errorMessage.match(new RegExp(msgToOverride));
								if (match && match.length) {
									errMsg = oCommentUi.i18n.serviceMessageOverrides[msgToOverride];
								}
							}
						}

						self.ui.setEditorError(errMsg);
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

		auth.loginRequired(function (err, authData) {
			if (err) {
				self.messageQueue.clear();
				return;
			}

			self.messageQueue.clear();
			postComment(commentBody, secondStepOfTryingToPost);
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

		oCommentApi.api.getAuth(function (err, authData) {
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
		oCommentApi.api.deleteComment({
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
					self.trigger('tracking.deleteComment', {
						collectionId: self.collectionId,
						comment: {
							id: commentId
						}
					});
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

		oCommentApi.api.getAuth(function (err, authData) {
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


	function handleStreamEventForBadgingComments (commentData) {
		if (commentData) {
			if (commentData.visibility === 2) {
				lastBannedCommentId = commentData.commentId;
				checkIfOwnCommentIsBanned();
			}

			if (commentData.visibility === 3) {
				lastPendingCommentId = commentData.commentId;
				checkIfOwnCommentIsPending();
			}
		}
	}

	function handleNewCommentForBadgingComments (commentData) {
		lastOwnCommentId = commentData.commentId;
		checkIfOwnCommentIsBanned();
		checkIfOwnCommentIsPending();
	}

	function checkIfOwnCommentIsBanned () {
		if (lastBannedCommentId === lastOwnCommentId) {
			self.ui.showOwnCommentBadge(lastBannedCommentId, 'blocked');
		}
	}

	function checkIfOwnCommentIsPending () {
		if (lastPendingCommentId === lastOwnCommentId) {
			self.ui.showOwnCommentBadge(lastPendingCommentId, 'pending');
		}
	}


	var __superDestroy = this.destroy;
	this.destroy = function () {
		self.ui.off();

		nextPageNumber = null;
		isMorePageAvailable = null;
		nextPageFetchInProgress = null;
		loginStatus = null;
		userIsAdmin = null;
		renderComplete = null;
		commentIds = null;

		self.collectionId = null;

		self.messageQueue.destroy();
		self.messageQueue = null;

		globalEvents.off('auth.login', login);
		globalEvents.off('auth.logout', logout);

		__superDestroy();
		__superDestroy = null;

		self = null;
	};


	// init
	if (this.config.autoInit !== false) {
		this.init.call(this);
	}
};
oCommentUi.Widget.__extend(Widget, 'oChat');

Widget.__extend = function(child, eventNamespace) {
	if (typeof Object.create === 'function') {
		child.prototype = Object.create(Widget.prototype);
	} else {
		var Tmp = function () {};
		Tmp.prototype = Widget.prototype;
		child.prototype = new Tmp();
		child.prototype.constructor = child;
	}

	if (eventNamespace) {
		child.prototype.eventNamespace = eventNamespace;
	}
};

module.exports = Widget;
