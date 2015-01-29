"use strict";

var oCommentUtilities = require('o-comment-utilities');
var oCommentUi = require('o-comment-ui');
var sizzle = require('sizzle');
var oDate = require('o-date');

var NewCommentNotification = require('./NewCommentNotification.js');
var templates = require('./templates.js');
var utils = require('./utils.js');
var envConfig = require('./config.js');

function WidgetUi (widgetContainer, config) {
	oCommentUi.WidgetUi.apply(this, arguments);

	config.orderType = config.orderType || "normal";

	var self = this;

	var events = new oCommentUtilities.Events();
	var newCommentNotification;

	var adaptedToHeight = false;
	var isPagination = false;
	var isOpen = true;
	var scrollMonitor;

	this.on = events.on;
	this.off = events.off;


	this.open = function () {
		if (isOpen === false) {
			isOpen = true;

			sizzle('.o-chat--editor-closed', self.widgetContainer)[0].style.display = 'none';
			sizzle('.o-chat--editor-input', self.widgetContainer)[0].style.display = 'block';
			sizzle('.o-chat--editor-footer', self.widgetContainer)[0].style.display = 'block';
		}
	};

	this.close = function () {
		if (isOpen === true) {
			isOpen = false;

			sizzle('.o-chat--editor-closed', self.widgetContainer)[0].style.display = 'block';
			sizzle('.o-chat--editor-input', self.widgetContainer)[0].style.display = 'none';
			sizzle('.o-chat--editor-footer', self.widgetContainer)[0].style.display = 'none';
		}
	};

	this.render = function (commentsData, adminMode, paginationEnabled) {
		isPagination = paginationEnabled;
		self.widgetContainer.innerHTML = "";

		var addEditor = function () {
			self.widgetContainer.appendChild(
				oCommentUi.utils.toDOM(
					templates.editor.render({
						submitButtonLabel: "Submit Comment",
						termMessageTemplate: oCommentUi.templates.termsAndGuidelinesTemplate.render(),
						signInTemplate: templates.signIn.render()
					})
				)
			);
		};

		var addComments = function () {
			self.widgetContainer.appendChild(
				oCommentUi.utils.toDOM(
					templates.comments.render({
						comments: commentsData,
						orderType: config.orderType,
						adminMode: adminMode
					})
				)
			);
		};

		if (config.orderType === 'inverted') {
			commentsData.reverse();
			addComments();
			addEditor();
		} else {
			addEditor();
			addComments();
		}

		try { oDate.init(); } catch(e) {}

		sizzle('.o-chat--signIn', self.widgetContainer)[0].addEventListener('click', function (evt) {
			events.trigger('signIn');

			if (evt.preventDefault) {
				evt.preventDefault();
			} else {
				evt.returnValue = false;
			}
		});

		sizzle('.o-chat--editor-submit > button')[0].addEventListener('click', function () {
			events.trigger('postComment');
		});

		sizzle('.o-chat--editor-input')[0].addEventListener('click', function (event) {
			sizzle('.o-chat--editor-input textarea')[0].focus();
			self.clearEditorError();

			if (event.preventDefault) {
				event.preventDefault();
			} else {
				event.returnValue = false;
			}
		});

		if (isPagination) {
			if (config.orderType === 'inverted') {
				sizzle('.o-chat--show-more-before', self.widgetContainer)[0].style.display = 'block';
			} else {
				sizzle('.o-chat--show-more-after', self.widgetContainer)[0].style.display = 'block';
			}

			sizzle('.o-chat--show-more .o-chat--show-more-label', self.widgetContainer)[0].addEventListener('click', function () {
				events.trigger('nextPage');
			});
		}

		var commentContainer = sizzle('.o-chat--comments-container', self.widgetContainer)[0];

		if (adminMode) {
			commentContainer.addEventListener('click', function (event) {
				if (event.target.className === 'o-chat--delete') {
					try {
						var commentId = event.target.parentNode.id.match(/commentid-([0-9]+)/)[1];

						events.trigger('deleteComment', commentId);
					} catch (e) {}

					if (event.preventDefault) {
						event.preventDefault();
					} else {
						event.returnValue = false;
					}
				}
			});
		}
	};

	this.adaptToHeight = function (height) {
		var adapt = function () {
			if (!adaptedToHeight) {
				if (isPagination) {
					self.disableButtonPagination();

					initScrollPagination();
				}
			}

			var commentArea = sizzle('.o-chat--comments-area', self.widgetContainer)[0];
			var editorContainer = sizzle('.o-chat--editor-container', self.widgetContainer)[0];
			var editorComputedStyle = oCommentUi.utils.getComputedStyle(editorContainer);

			var editorContainerMarginTopValue;
			var editorContainerMarginTop = editorComputedStyle.getPropertyValue('margin-top');
			if (editorContainerMarginTop.indexOf('px') !== -1) {
				editorContainerMarginTopValue = parseInt(editorContainerMarginTop.replace('px', ''), 10);
			} else {
				editorContainerMarginTopValue = 0;
			}

			var editorContainerMarginBottomValue;
			var editorContainerMarginBottom = editorComputedStyle.getPropertyValue('margin-bottom');
			if (editorContainerMarginBottom.indexOf('px') !== -1) {
				editorContainerMarginBottomValue = parseInt(editorContainerMarginBottom.replace('px', ''), 10);
			} else {
				editorContainerMarginBottomValue = 0;
			}

			var editorHeight = editorContainer.clientHeight + editorContainerMarginTopValue + editorContainerMarginBottomValue;
			commentArea.style.overflow = "auto";
			commentArea.style.height = (height - editorHeight) + "px";

			if (!adaptedToHeight) {
				adaptedToHeight = true;

				oCommentUtilities.logger.debug("adapt to height, scroll to last");
				scrollToLastComment();

				initNotification();
			}
		};

		// poll for the existence of container
		var pollForContainer = setInterval(function () {
			if (sizzle('.o-chat--editor-container', self.widgetContainer).length > 0) {
				clearInterval(pollForContainer);
				adapt();
			}
		}, 200);
	};


	// Specific functions for the widget that was shrinked to a fixed height

		function initScrollPagination () {
			var commentArea = sizzle('.o-chat--comments-area', self.widgetContainer)[0];
			scrollMonitor = new oCommentUtilities.dom.ScrollMonitor(commentArea, function (scrollPos) {
				if (config.orderType === 'inverted') {
					if (scrollPos < 0.2 * commentArea.scrollHeight) {
						events.trigger('nextPage');
					}
				} else {
					if (scrollPos + commentArea.clientHeight > 0.8 * commentArea.scrollHeight) {
						events.trigger('nextPage');
					}
				}
			});
		}

		function initNotification () {
			var commentArea = sizzle('.o-chat--comments-area', self.widgetContainer)[0];
			newCommentNotification = new NewCommentNotification(self, commentArea, (config.orderType === "inverted" ? 'bottom' : 'top'));
		}


		function scrollToLastComment () {
			var commentArea = sizzle('.o-chat--comments-area', self.widgetContainer)[0];

			if (config.orderType === "inverted") {
				commentArea.scrollTop = commentArea.scrollHeight - commentArea.clientHeight + 1;
			} else {
				commentArea.scrollTop = 0;
			}
		}

		function notifyNewComment () {
			setTimeout(function () {
				newCommentNotification.newComment();
			}, 100);
		}

	this.disableButtonPagination = function () {
		sizzle('.o-chat--show-more-before', self.widgetContainer)[0].style.display = 'none';
		sizzle('.o-chat--show-more-after', self.widgetContainer)[0].style.display = 'none';
	};

	this.login = function (token, pseudonym, isAdmin) {
		var authEl = sizzle('.o-chat--editor-auth', self.widgetContainer);

		if (authEl && authEl.length) {
			authEl[0].innerHTML = templates.loggedIn.render({
				token: token,
				pseudonym: pseudonym.substring(0, 50),
				livefyreNetwork: envConfig.get().livefyre.network,
				isAdmin: isAdmin
			});
		}
	};

	this.logout = function () {
		var authEl = sizzle('.o-chat--editor-auth', self.widgetContainer);

		if (authEl && authEl.length) {
			authEl[0].innerHTML = templates.signIn.render();
		}
	};

	this.getCurrentPseudonym = function () {
		var pseudonymArea = sizzle('.o-chat--editor-auth .o-chat--pseudonym', self.widgetContainer);

		if (pseudonymArea && pseudonymArea.length) {
			return pseudonymArea[0].innerHTML;
		}

		return "";
	};

	this.hideSignInLink = function () {
		var authEl = sizzle('.o-chat--editor-auth', self.widgetContainer);

		if (authEl && authEl.length) {
			authEl[0].innerHTML = "";
		}
	};

	this.makeReadOnly = function () {
		var commentEditorInputContainer = sizzle('.o-chat--editor-input', self.widgetContainer);

		if (commentEditorInputContainer && commentEditorInputContainer.length) {
			commentEditorInputContainer = commentEditorInputContainer[0];

			commentEditorInputContainer.className += " disabled";
			sizzle('textarea', commentEditorInputContainer)[0].setAttribute('disabled', 'disabled');
			sizzle('.o-chat--editor-submit button', self.widgetContainer)[0].setAttribute('disabled', 'disabled');
		}
	};

	this.makeEditable = function () {
		var commentEditorInputContainer = sizzle('.o-chat--editor-input', self.widgetContainer);

		if (commentEditorInputContainer && commentEditorInputContainer.length) {
			commentEditorInputContainer = commentEditorInputContainer[0];

			commentEditorInputContainer.className = commentEditorInputContainer.className.replace('disabled', '');
			sizzle('textarea', commentEditorInputContainer)[0].removeAttribute('disabled');
			sizzle('.o-chat--editor-submit button', self.widgetContainer)[0].removeAttribute('disabled');
		}
	};

	// content, pseudonym, id, timestamp
	this.addComment = function (commentData, ownComment, adminMode) {
		ownComment = typeof ownComment === 'boolean' ? ownComment : false;

		var commentContainer = sizzle('.o-chat--comments-container', self.widgetContainer)[0];
		var commentArea = sizzle('.o-chat--comments-area', self.widgetContainer)[0];

		// normalize timestamp if one provided or use current time
		var timestamp = commentData.timestamp ? oCommentUtilities.dateHelper.toTimestamp(commentData.timestamp) : new Date();

		var scrolledToLast;

		var commentDom = oCommentUi.utils.toDOM(
			templates.comment.render({
				commentId: commentData.id,
				content: commentData.content,
				dateToShow: this.formatTimestamp(timestamp),
				datetime: oCommentUtilities.dateHelper.toISOString(timestamp),
				timestamp: oCommentUtilities.dateHelper.toTimestamp(timestamp),
				relativeTime: this.isRelativeTime(timestamp),
				author: {
					displayName: commentData.displayName.substring(0, 50)
				},
				adminMode: adminMode
			})
		);


		var comments = sizzle('.o-chat--wrapper', commentContainer);
		var i;
		var inserted = false;

		if (config.orderType === "inverted") {
			oCommentUtilities.logger.debug("new comment");
			scrolledToLast = (commentArea.scrollTop >= (commentArea.scrollHeight - commentArea.clientHeight - 3));

			oCommentUtilities.logger.debug("scrolledToLast", scrolledToLast);

			for (i = comments.length-1; i >= 0; i--) {
				if (parseInt(comments[i].getAttribute('data-timestamp'), 10) < timestamp) {
					if (i === comments.length-1) {
						commentContainer.appendChild(commentDom);
					} else {
						commentContainer.insertBefore(commentDom, comments[i+1]);
					}
					inserted = true;
					break;
				}
			}

			if (!inserted) {
				commentContainer.insertBefore(commentDom, commentContainer.firstChild);
			}

			if (ownComment || scrolledToLast) {
				scrollToLastComment();
			}
		} else {
			scrolledToLast = (commentArea.scrollTop <= 3);

			for (i = 0; i < comments.length; i++) {
				if (parseInt(comments[i].getAttribute('data-timestamp'), 10) < timestamp) {
					commentContainer.insertBefore(commentDom, comments[i]);
					inserted = true;
					break;
				}
			}

			if (!inserted) {
				commentContainer.appendChild(commentDom);
			}

			if (ownComment || scrolledToLast) {
				scrollToLastComment();
			}
		}

		if (this.isRelativeTime(timestamp)) {
			commentDom = sizzle('#commentid-' + commentData.id, self.widgetContainer)[0];

			var timeoutToStart = 10000;
			if (new Date().getTime() - timestamp < 0) {
				timeoutToStart += Math.abs(new Date().getTime() - timestamp);
			}

			setTimeout(function () {
				try { oDate.init(commentDom); } catch(e) {}
			}, timeoutToStart);
		}

		notifyNewComment();
	};

	this.addNextPageComments = function (comments, adminMode) {
		var commentContainer = sizzle('.o-chat--comments-container', self.widgetContainer)[0];
		var commentArea = sizzle('.o-chat--comments-area', self.widgetContainer)[0];

		var commentData;
		var commentDom;

		for (var index = 0; index < comments.length; index++) {
			commentData = comments[index];

			commentDom = oCommentUi.utils.toDOM(
				templates.comment.render({
					commentId: commentData.commentId,
					content: commentData.content,
					dateToShow: this.formatTimestamp(commentData.timestamp),
					datetime: oCommentUtilities.dateHelper.toISOString(commentData.timestamp),
					timestamp: oCommentUtilities.dateHelper.toTimestamp(commentData.timestamp),
					relativeTime: this.isRelativeTime(commentData.timestamp),
					author: {
						displayName: commentData.author.displayName.substring(0, 50)
					},
					adminMode: adminMode
				})
			);

			var previousScrollHeight = commentArea.scrollHeight;
			if (config.orderType === "inverted") {
				commentContainer.insertBefore(commentDom, commentContainer.firstChild);

				commentArea.scrollTop += commentArea.scrollHeight - previousScrollHeight;
			} else {
				commentContainer.appendChild(commentDom);
			}
		}
	};

	this.removeComment = function (id) {
		var comment = sizzle('#commentid-'+id, self.widgetContainer);
		if (comment && comment.length) {
			comment[0].parentNode.removeChild(comment[0]);
		}
	};

	this.updateComment = function (id, newContent) {
		var commentContentEl = sizzle('#commentid-' + id + ' .o-chat--content', self.widgetContainer);
		if (commentContentEl && commentContentEl.length) {
			commentContentEl[0].innerHTML = newContent;
		}
	};

	this.markCommentAsDeleteInProgress = function (id) {
		var comment = sizzle('#commentid-'+id, self.widgetContainer);
		if (comment && comment.length) {
			comment[0].className += " o-chat--delete-progress";
		}
	};

	this.markCommentAsDeleteInProgressEnded = function (id) {
		var comment = sizzle('#commentid-'+id, self.widgetContainer);
		if (comment && comment.length) {
			comment[0].className = comment[0].className.replace("o-chat--delete-progress", "");
		}
	};

	this.getCurrentComment = function () {
		var commentArea = sizzle('.o-chat--editor-input textarea', self.widgetContainer);

		if (commentArea && commentArea.length) {
			return utils.strings.trim(commentArea[0].value).replace(/(?:\r\n|\r|\n)/g, '<br />');
		}

		return "";
	};

	this.emptyCommentArea = function () {
		var commentArea = sizzle('.o-chat--editor-input textarea', self.widgetContainer);

		if (commentArea && commentArea.length) {
			commentArea[0].value = "";
		}
	};

	this.repopulateCommentArea = function (text) {
		var commentArea = sizzle('.o-chat--editor-input textarea', self.widgetContainer);

		if (commentArea && commentArea.length && text && text.length) {
			commentArea[0].value = text.replace(/<br \/>/g, '\n');
		}
	};

	this.addSettingsLink = function (options) {
		var loginBarContainer = sizzle('.o-chat--editor-auth', self.widgetContainer);
		if (loginBarContainer && loginBarContainer.length) {
			loginBarContainer[0].appendChild(oCommentUi.utils.toDOM(oCommentUi.templates.commentingSettingsLink.render({
				label: "Edit pseudonym",
				withoutSeparator: true
			})));
		} else {
			return;
		}

		var settingsLink = sizzle('.o-comment-ui--settings-text', loginBarContainer[0]);
		if (settingsLink && settingsLink.length) {
			settingsLink[0].addEventListener('click', function () {
				if (options && typeof options.onClick === 'function') {
					options.onClick();
				}
			});

			if (options && typeof options.onAdded === 'function') {
				options.onAdded();
			}
		}
	};

	this.addNotAvailableMessage = function () {
		self.widgetContainer.innerHTML = oCommentUi.templates.unavailableTemplate.render({
			message: oCommentUi.i18n.texts.unavailable,
			fontSize: "12px",
			style: "padding: 10px 0 20px 0;"
		});
	};

	this.removeSettingsLink = function () {
		var settingsLink = sizzle('.o-comment-ui--settings', self.widgetContainer);
		if (settingsLink && settingsLink.length) {
			settingsLink[0].parentNode.removeChild(settingsLink[0]);
		}
	};

	this.setEditorError = function (err) {
		var editorErrorContainer = sizzle('.o-chat--editor-error', self.widgetContainer)[0];

		editorErrorContainer.innerHTML = err;
		editorErrorContainer.style.display = 'block';
	};

	this.clearEditorError = function () {
		var editorErrorContainer = sizzle('.o-chat--editor-error', self.widgetContainer)[0];

		editorErrorContainer.style.display = 'none';
		editorErrorContainer.innerHTML = '';
	};

	this.formatTimestamp = function (timestampOrDate) {
		var timestamp = oCommentUtilities.dateHelper.toTimestamp(timestampOrDate);
		var isRelative = this.isRelativeTime(timestampOrDate);

		if (isRelative) {
			// relative time
			if (timestamp >= new Date().getTime() - 1500) {
				return "just now";
			} else {
				return oDate.timeAgo(timestamp);
			}
		} else {
			// absolute time
			return oDate.format(timestamp, config.datetimeFormat.absoluteFormat);
		}
	};

	this.isRelativeTime = function (timestampOrDate) {
		var timestamp = oCommentUtilities.dateHelper.toTimestamp(timestampOrDate);

		if (config.datetimeFormat.minutesUntilAbsoluteTime === -1 ||
			new Date().getTime() - timestamp > config.datetimeFormat.minutesUntilAbsoluteTime * 60 * 1000) {

			return false;
		} else {
			return true;
		}
	};

	var __superDestroy = this.destroy;
	this.destroy = function () {
		self.off();

		events.destroy();
		events = null;

		scrollMonitor.destroy();
		scrollMonitor = null;

		newCommentNotification.destroy();
		newCommentNotification = null;

		adaptedToHeight = null;
		isPagination = null;
		isOpen = null;

		__superDestroy();
		__superDestroy = null;

		self = null;
	};
}

WidgetUi.__extend = function(child) {
	if (typeof Object.create === 'function') {
		child.prototype = Object.create(WidgetUi.prototype);
	} else {
		var Tmp = function () {};
		Tmp.prototype = WidgetUi.prototype;
		child.prototype = new Tmp();
		child.prototype.constructor = child;
	}
};

oCommentUi.WidgetUi.__extend(WidgetUi);

module.exports = WidgetUi;
