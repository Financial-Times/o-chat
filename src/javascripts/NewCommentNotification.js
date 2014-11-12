"use strict";

var templates = require('./templates.js');
var oCommentUi = require('o-comment-ui');
var sizzle = require('sizzle');
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
		position: position
	})));
	var notificationElement = sizzle('#o-comment-client-notification-' + notificationId)[0];
	var notificationButton = sizzle('.o-comment-client-notification-button', notificationElement)[0];


	var onClick = function () {
		self.reset();
		if (position === "bottom") {
			container.scrollTop = container.scrollHeight - container.clientHeight;
		} else {
			container.scrollTop = 0;
		}
	};
	oCommentUtilities.dom.eventListener.addEventListener('click', notificationButton, onClick);
	oCommentUtilities.dom.eventListener.addEventListener('click', notificationElement, function () {
		container.focus();
	});

	var verifyNotificationStatus = function (scrollPos) {
        if (position === "bottom") {
            if (scrollPos === container.scrollHeight - container.clientHeight) {
                if (active === true) {
                    self.reset();
                }
                active = false;
            } else {
                active = true;
            }
        } else {
            if (scrollPos === 0) {
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
		scrollMonitorForNotification.stop();
		notificationElement.parentNode.removeChild(notificationElement);
	};
}

module.exports = NewCommentNotification;
