"use strict";

var templates = require('./templates.js');
var oCommentUi = require('o-comment-ui');
var oCommentUtilities = require('o-comment-utilities');

function NewCommentNotification (widgetUi, container, position) {
	var self = this;

	if (position !== "bottom" && position !== "top") {
		position = "top";
	}

	var notificationId = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

	var active = false;

	container.parentNode.appendChild(oCommentUi.utils.toDOM(templates.notification.render({
		id: notificationId,
		position: position,
		arrowIconClass: (position === 'bottom' ? 'downwards' : 'upwards')
	})));
	var notificationElement = document.querySelector('#o-chat--notification-' + notificationId);
	var notificationButton = document.querySelector('.o-chat--notification-button', notificationElement);


	var onClickButton = function () {
		self.reset();
		if (position === "bottom") {
			container.scrollTop = container.scrollHeight - container.clientHeight;
		} else {
			container.scrollTop = 0;
		}
	};
	notificationButton.addEventListener('click', onClickButton);

	var onClickElement = function () {
		container.focus();
	};
	notificationElement.addEventListener('click', onClickElement);

	var verifyNotificationStatus = function (scrollPos) {
		if (position === "bottom") {
			if (scrollPos >= container.scrollHeight - container.clientHeight - 3) {
				if (active === true) {
					self.reset();
				}
				active = false;
			} else {
				active = true;
			}
		} else {
			if (scrollPos <= 3) {
				if (active === true) {
					self.reset();
				}
				active = false;
			} else {
				active = true;
			}
		}
	};
	var scrollMonitorForNotification = new oCommentUtilities.dom.ScrollMonitor(container, verifyNotificationStatus);
	verifyNotificationStatus(container.scrollTop);

	this.newComment = function () {
		verifyNotificationStatus(container.scrollTop);
		if (active) {
			oCommentUtilities.logger.debug('notification activated');
			notificationElement.style.display = 'block';
		}
	};

	this.reset = function () {
		notificationElement.style.display = 'none';

		oCommentUtilities.logger.debug('notification reset');
	};

	this.destroy = function () {
		scrollMonitorForNotification.destroy();

		notificationId = null;
		active = null;

		notificationButton.removeEventListener('click', onClickButton);
		onClickButton = null;

		notificationElement.removeEventListener('click', onClickElement);
		onClickElement = null;

		notificationElement.parentNode.removeChild(notificationElement);
		notificationElement = null;
		notificationButton = null;

		self = null;
	};
}

module.exports = NewCommentNotification;
