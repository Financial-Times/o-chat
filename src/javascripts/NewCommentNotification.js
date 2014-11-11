"use strict";

var templates = require('./templates.js');
var oCommentUi = require('o-comment-ui');
var sizzle = require('sizzle');
var oCommentUtilities = require('o-comment-utilities');

function NewCommentNotification () {
	var self = this;

	var activeCommentCount = 0;
	var notificationId = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

	document.body.appendChild(oCommentUi.utils.toDOM(templates.notification.render({
		id: notificationId
	})));
	var notificationElement = sizzle('#o-comment-client-notification-' + notificationId)[0];
	var notificationContainer = sizzle('.o-comment-client-notification-container', notificationElement)[0];
	var notificationCounter = sizzle('.o-comment-client-notification-counter', notificationElement)[0];

	this.add = function (commentData) {
		activeCommentCount++;
		notificationCounter.innerHTML = activeCommentCount;

		notificationContainer.appendChild(oCommentUi.utils.toDOM(templates.notificationEntry.render({
			id: commentData.id,
			content: commentData.content
		})));

		notificationElement.style.display = 'block';

		self.listen(commentData.id);

		setTimeout(function () {
			self.remove(commentData.id);
		}, 5000);
	};

	this.remove = function (id) {
		var el = sizzle('#o-comment-client-notification-entry-id-' + id, notificationContainer);
		if (el && el.length) {
			el[0].style.display = 'none';
		}
	};

	this.reset = function () {
		notificationElement.style.display = 'none';
		notificationContainer.innerHTML = "";
		activeCommentCount = 0;
		notificationCounter.innerHTML = activeCommentCount;

		oCommentUtilities.logger.debug('notification reset');
	};
}

module.exports = NewCommentNotification;
