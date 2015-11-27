const oCommentUtilities = require('o-comment-utilities');
const oCommentUi = require('o-comment-ui');
const oDate = require('o-date');

const NewCommentNotification = require('./NewCommentNotification.js');
const templates = require('./templates.js');
const utils = require('./utils.js');
const envConfig = require('./config.js');

function WidgetUi (widgetContainer, config) {
	oCommentUi.WidgetUi.apply(this, arguments);

	config.orderType = config.orderType || "normal";

	let self = this;

	let events = new oCommentUtilities.Events();
	let newCommentNotification;

	let adaptedToHeight = false;
	let isPagination = false;
	let isOpen = true;
	let scrollMonitor;

	let destroyed = false;
	const executeWhenNotDestroyed = function (func) {
		return function () {
			if (!destroyed) {
				func.apply(this, arguments);
			}
		};
	};

	this.on = events.on;
	this.off = events.off;


	let elements = {};


	this.open = function () {
		if (isOpen === false) {
			isOpen = true;

			self.widgetContainer.querySelector('.o-chat--editor-closed').style.display = 'none';
			self.widgetContainer.querySelector('.o-chat--editor-input').style.display = 'block';
			self.widgetContainer.querySelector('.o-chat--editor-footer').style.display = 'block';
		}
	};

	this.close = function () {
		if (isOpen === true) {
			isOpen = false;

			self.widgetContainer.querySelector('.o-chat--editor-closed').style.display = 'block';
			self.widgetContainer.querySelector('.o-chat--editor-input').style.display = 'none';
			self.widgetContainer.querySelector('.o-chat--editor-footer').style.display = 'none';
		}
	};

	this.render = function (commentsData, adminMode, paginationEnabled) {
		let i;

		isPagination = paginationEnabled;
		oCommentUtilities.logger.debug('isPagination', isPagination);

		self.widgetContainer.innerHTML = "";

		const commentsRendered = [];
		for (i = 0; i < commentsData.length; i++) {
			commentsRendered.push(templates.comment.render(oCommentUtilities.merge({}, commentsData[i], {adminMode: adminMode})));
		}

		const addEditor = function () {
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

		const addComments = function () {
			self.widgetContainer.appendChild(
				oCommentUi.utils.toDOM(
					templates.comments.render({
						comments: commentsRendered,
						orderType: config.orderType
					})
				)
			);
		};

		if (config.orderType === 'inverted') {
			commentsRendered.reverse();
			commentsData.reverse();
			addComments();
			addEditor();
		} else {
			addEditor();
			addComments();
		}

		try { oDate.init(); } catch(e) {}


		// save DOM elements
		elements.commentContainer = self.widgetContainer.querySelector('.o-chat--comments-container');
		elements.commentArea = self.widgetContainer.querySelector('.o-chat--comments-area');
		elements.editorContainer = self.widgetContainer.querySelector('.o-chat--editor-container');
		elements.editorArea = self.widgetContainer.querySelector('.o-chat--editor-area');
		elements.editorAuthContainer = self.widgetContainer.querySelector('.o-chat--editor-auth-container');
		elements.editorAuth = self.widgetContainer.querySelector('.o-chat--editor-auth');
		elements.signIn = self.widgetContainer.querySelector('.o-chat--signIn');
		elements.postCommentButton = self.widgetContainer.querySelector('.o-chat--editor-submit > button');
		elements.editorInput = self.widgetContainer.querySelector('.o-chat--editor-input');
		elements.editorInputTextarea = elements.editorInput.querySelector('textarea');
		elements.editorErrorContainer = self.widgetContainer.querySelector('.o-chat--editor-error');
		elements.showMore = {
			before: self.widgetContainer.querySelector('.o-chat--show-more-before'),
			after: self.widgetContainer.querySelector('.o-chat--show-more-after'),
			labels: self.widgetContainer.querySelectorAll('.o-chat--show-more .o-chat--show-more-label')
		};




		elements.signIn.addEventListener('click', function (evt) {
			events.trigger('signIn');

			if (evt.preventDefault) {
				evt.preventDefault();
			} else {
				evt.returnValue = false;
			}
		});

		elements.postCommentButton.addEventListener('click', function () {
			events.trigger('postComment');
		});

		elements.editorInput.addEventListener('click', function (event) {
			elements.editorInputTextarea.focus();
			self.clearEditorError();

			if (event.preventDefault) {
				event.preventDefault();
			} else {
				event.returnValue = false;
			}
		});

		if (isPagination) {
			if (config.orderType === 'inverted') {
				elements.showMore.before.style.display = 'block';
			} else {
				elements.showMore.after.style.display = 'block';
			}

			const triggereNextPage = function () {
				events.trigger('nextPage');
			};

			for (i = 0; i < elements.showMore.labels.length; i++) {
				elements.showMore.labels[i].addEventListener('click', triggereNextPage);
			}
		}

		if (adminMode) {
			elements.commentContainer.addEventListener('click', function (event) {
				if (event.target.className === 'o-chat--delete') {
					try {
						const commentId = event.target.parentNode.id.match(/commentid-([0-9]+)/)[1];

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
		const adapt = executeWhenNotDestroyed(function () {
			if (!adaptedToHeight) {
				if (isPagination) {
					self.disableButtonPagination();

					initScrollPagination();
				}
			}

			const editorComputedStyle = oCommentUi.utils.getComputedStyle(elements.editorArea);

			let editorAreaMarginTopValue;
			const editorAreaMarginTop = editorComputedStyle.getPropertyValue('margin-top');
			if (editorAreaMarginTop.indexOf('px') !== -1) {
				editorAreaMarginTopValue = parseInt(editorAreaMarginTop.replace('px', ''), 10);
			} else {
				editorAreaMarginTopValue = 0;
			}

			let editorAreaMarginBottomValue;
			const editorAreaMarginBottom = editorComputedStyle.getPropertyValue('margin-bottom');
			if (editorAreaMarginBottom.indexOf('px') !== -1) {
				editorAreaMarginBottomValue = parseInt(editorAreaMarginBottom.replace('px', ''), 10);
			} else {
				editorAreaMarginBottomValue = 0;
			}

			const editorHeight = elements.editorArea.clientHeight + editorAreaMarginTopValue + editorAreaMarginBottomValue;
			elements.commentArea.style.overflow = "auto";
			elements.commentArea.style.height = (height - editorHeight) + "px";

			if (!adaptedToHeight) {
				adaptedToHeight = true;

				oCommentUtilities.logger.debug("adapt to height, scroll to last");
				scrollToLastComment();

				initNotification();
			}
		});

		// poll for the existence of container
		const pollForContainer = setInterval(function () {
			if (destroyed) {
				clearInterval(pollForContainer);
				return;
			}

			if (self.widgetContainer.querySelector('.o-chat--editor-container')) {
				clearInterval(pollForContainer);
				adapt();
			}
		}, 200);
	};


	// Specific functions for the widget that was shrinked to a fixed height

		function initScrollPagination () {
			scrollMonitor = new oCommentUtilities.dom.ScrollMonitor(elements.commentArea, function (scrollPos) {
				if (config.orderType === 'inverted') {
					if (scrollPos < 0.2 * elements.commentArea.scrollHeight) {
						events.trigger('nextPage');
						oCommentUtilities.logger.debug('nextPage');
					}
				} else {
					if (scrollPos + elements.commentArea.clientHeight > 0.8 * elements.commentArea.scrollHeight) {
						events.trigger('nextPage');
						oCommentUtilities.logger.debug('nextPage');
					}
				}
			});
		}

		function initNotification () {
			newCommentNotification = new NewCommentNotification(self, elements.commentArea, (config.orderType === "inverted" ? 'bottom' : 'top'));
		}


		function scrollToLastComment () {
			if (config.orderType === "inverted") {
				elements.commentArea.scrollTop = elements.commentArea.scrollHeight - elements.commentArea.clientHeight + 1;
			} else {
				elements.commentArea.scrollTop = 0;
			}
		}

		function notifyNewComment () {
			setTimeout(executeWhenNotDestroyed(function () {
				if (newCommentNotification) {
					newCommentNotification.newComment();
				}
			}), 100);
		}

	this.disableButtonPagination = function () {
		elements.showMore.before.style.display = 'none';
		elements.showMore.after.style.display = 'none';
	};

	this.login = function (token, pseudonym, isAdmin) {
		if (elements.editorAuth) {
			elements.editorAuth.innerHTML = templates.loggedIn.render({
				token: token,
				pseudonym: pseudonym.substring(0, 50),
				livefyreNetwork: envConfig.get().livefyre.network,
				isAdmin: isAdmin
			});
		}
	};

	this.logout = function () {
		if (elements.editorAuth) {
			elements.editorAuth.innerHTML = templates.signIn.render();
		}
	};

	this.getCurrentPseudonym = function () {
		const pseudonymArea = elements.editorAuth.querySelector('.o-chat--pseudonym');

		if (pseudonymArea) {
			return pseudonymArea.innerHTML;
		}

		return "";
	};

	this.hideSignInLink = function () {
		if (elements.editorAuth) {
			elements.editorAuth.innerHTML = "";
		}
	};

	/**
	 * Inserts message when SUDS reports as authentication is not available.
	 * @return {undefined}
	 */
	this.addAuthNotAvailableMessage = function () {
		elements.editorAuthContainer.appendChild(oCommentUi.utils.toDOM(oCommentUi.templates.authUnavailableTemplate.render()));
	};

	this.hideEditor = function () {
		elements.editorContainer.style.display = 'none';
	};

	this.showEditor = function () {
		elements.editorContainer.style.display = 'block';
	};

	this.makeReadOnly = function () {
		if (elements.editorInput) {
			elements.editorInput.className += " disabled";
			elements.editorInputTextarea.setAttribute('disabled', 'disabled');
			elements.postCommentButton.setAttribute('disabled', 'disabled');
		}
	};

	this.makeEditable = function () {
		if (elements.editorInput) {
			elements.editorInput.className = elements.editorInput.className.replace(' disabled', '');
			elements.editorInputTextarea.removeAttribute('disabled');
			elements.postCommentButton.removeAttribute('disabled');
		}
	};

	// content, pseudonym, id, timestamp
	this.addComment = function (commentData, ownComment, adminMode) {
		ownComment = typeof ownComment === 'boolean' ? ownComment : false;

		// normalize timestamp if one provided or use current time
		const timestamp = commentData.timestamp ? oCommentUtilities.dateHelper.toTimestamp(commentData.timestamp) : new Date();

		let scrolledToLast;

		let commentDom = oCommentUi.utils.toDOM(
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


		const comments = elements.commentContainer.querySelectorAll('.o-chat--wrapper');
		let i;
		let inserted = false;

		if (config.orderType === "inverted") {
			oCommentUtilities.logger.debug("new comment");
			scrolledToLast = (elements.commentArea.scrollTop >= (elements.commentArea.scrollHeight - elements.commentArea.clientHeight - 3));

			oCommentUtilities.logger.debug("scrolledToLast", scrolledToLast);

			for (i = comments.length-1; i >= 0; i--) {
				if (parseInt(comments[i].getAttribute('data-timestamp'), 10) < timestamp) {
					if (i === comments.length-1) {
						elements.commentContainer.appendChild(commentDom);
					} else {
						elements.commentContainer.insertBefore(commentDom, comments[i+1]);
					}
					inserted = true;
					break;
				}
			}

			if (!inserted) {
				elements.commentContainer.insertBefore(commentDom, elements.commentContainer.firstChild);
			}

			if (ownComment || scrolledToLast) {
				scrollToLastComment();
			}
		} else {
			scrolledToLast = (elements.commentArea.scrollTop <= 3);

			for (i = 0; i < comments.length; i++) {
				if (parseInt(comments[i].getAttribute('data-timestamp'), 10) < timestamp) {
					elements.commentContainer.insertBefore(commentDom, comments[i]);
					inserted = true;
					break;
				}
			}

			if (!inserted) {
				elements.commentContainer.appendChild(commentDom);
			}

			if (ownComment || scrolledToLast) {
				scrollToLastComment();
			}
		}

		if (this.isRelativeTime(timestamp)) {
			commentDom = self.widgetContainer.querySelector('#commentid-' + commentData.id);

			let timeoutToStart = 10000;
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
		let commentData;
		let commentDom;

		for (let index = 0; index < comments.length; index++) {
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

			const previousScrollHeight = elements.commentArea.scrollHeight;
			if (config.orderType === "inverted") {
				elements.commentContainer.insertBefore(commentDom, elements.commentContainer.firstChild);

				elements.commentArea.scrollTop += elements.commentArea.scrollHeight - previousScrollHeight;
			} else {
				elements.commentContainer.appendChild(commentDom);
			}
		}
	};

	this.removeComment = function (id) {
		const comment = self.widgetContainer.querySelector('#commentid-'+id);
		if (comment) {
			comment.parentNode.removeChild(comment);
		}
	};

	this.updateComment = function (id, newContent) {
		const commentContentEl = self.widgetContainer.querySelector('#commentid-' + id + ' .o-chat--content');
		if (commentContentEl) {
			commentContentEl.innerHTML = newContent;
		}
	};

	this.markCommentAsDeleteInProgress = function (id) {
		const comment = self.widgetContainer.querySelector('#commentid-'+id);
		if (comment) {
			comment.className += " o-chat--delete-progress";
		}
	};

	this.markCommentAsDeleteInProgressEnded = function (id) {
		const comment = self.widgetContainer.querySelector('#commentid-'+id);
		if (comment) {
			comment.className = comment.className.replace("o-chat--delete-progress", "");
		}
	};

	this.getCurrentComment = function () {
		if (elements.editorInputTextarea) {
			return utils.strings.trim(elements.editorInputTextarea.value).replace(/(?:\r\n|\r|\n)/g, '<br />');
		}

		return "";
	};

	this.emptyCommentArea = function () {
		if (elements.editorInputTextarea) {
			elements.editorInputTextarea.value = "";
		}
	};

	this.repopulateCommentArea = function (text) {
		if (elements.editorInputTextarea && text && text.length) {
			elements.editorInputTextarea.value = text.replace(/<br \/>/g, '\n');
		}
	};

	this.addSettingsLink = function (options) {
		const loginBarContainer = self.widgetContainer.querySelector('.o-chat--editor-auth');

		if (loginBarContainer) {
			loginBarContainer.appendChild(oCommentUi.utils.toDOM(oCommentUi.templates.commentingSettingsLink.render({
				label: "Edit pseudonym",
				withoutSeparator: true
			})));
		} else {
			return;
		}

		const settingsLink = loginBarContainer.querySelector('.o-comment-ui--settings-text');
		if (settingsLink) {
			settingsLink.addEventListener('click', function () {
				if (options && typeof options.onClick === 'function') {
					options.onClick();
				}
			});

			if (options && typeof options.onAdded === 'function') {
				options.onAdded();
			}
		}
	};

	this.removeSettingsLink = function () {
		const settingsLink = self.widgetContainer.querySelector('.o-comment-ui--settings');
		if (settingsLink) {
			settingsLink.parentNode.removeChild(settingsLink);
		}
	};

	this.addNotAvailableMessage = function () {
		self.widgetContainer.innerHTML = oCommentUi.templates.unavailableTemplate.render({
			message: oCommentUi.i18n.texts.unavailable,
			fontSize: "12px",
			style: "padding: 10px 0 20px 0;"
		});
	};

	this.showOwnCommentBadge = function (commentId, type) {
		const commentElement = self.widgetContainer.querySelector('#commentid-'+ commentId);

		if (type === 'blocked' || type === 'pending') {
			if (commentElement && !commentElement.querySelector('.o-chat--' + type)) {
				const badgeElement = document.createElement('div');

				badgeElement.innerHTML = type;
				badgeElement.className = 'o-chat--' + type;

				commentElement.insertBefore(badgeElement, commentElement.firstChild);
				scrollToLastComment();
			}
		}
	};

	this.removeOwnCommentBadge = function (commentId, type) {
		const commentElement = self.widgetContainer.querySelector('#commentid-'+ commentId);

		if (type === 'blocked' || type === 'pending') {
			if (commentElement) {
				const badge = commentElement.querySelector('.o-chat--' + type);

				if (badge) {
					badge.parentNode.removeChild(badge);
				}
			}
		}
	};

	this.setEditorError = function (err) {
		elements.editorErrorContainer.innerHTML = err;
		elements.editorErrorContainer.style.display = 'block';
	};

	this.clearEditorError = function () {
		elements.editorErrorContainer.style.display = 'none';
		elements.editorErrorContainer.innerHTML = '';
	};

	this.formatTimestamp = function (timestampOrDate) {
		const timestamp = oCommentUtilities.dateHelper.toTimestamp(timestampOrDate);
		const isRelative = this.isRelativeTime(timestampOrDate);

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
		const timestamp = oCommentUtilities.dateHelper.toTimestamp(timestampOrDate);

		if (config.datetimeFormat.minutesUntilAbsoluteTime === -1 ||
			new Date().getTime() - timestamp > config.datetimeFormat.minutesUntilAbsoluteTime * 60 * 1000) {

			return false;
		} else {
			return true;
		}
	};

	let __superDestroy = this.destroy;
	this.destroy = function () {
		self.off();

		destroyed = true;

		events.destroy();
		events = null;

		if (scrollMonitor) {
			scrollMonitor.destroy();
		}
		scrollMonitor = null;

		if (newCommentNotification) {
			newCommentNotification.destroy();
		}
		newCommentNotification = null;

		adaptedToHeight = null;
		isPagination = null;
		isOpen = null;

		elements = null;

		__superDestroy();
		__superDestroy = null;

		self = null;
	};
}

WidgetUi.__extend = function(child) {
	if (typeof Object.create === 'function') {
		child.prototype = Object.create(WidgetUi.prototype);
	} else {
		const Tmp = function () {};
		Tmp.prototype = WidgetUi.prototype;
		child.prototype = new Tmp();
		child.prototype.constructor = child;
	}
};

oCommentUi.WidgetUi.__extend(WidgetUi);

module.exports = WidgetUi;
