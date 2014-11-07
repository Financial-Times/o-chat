"use strict";

var templates = require('./templates.js');
var oCommentUi = require('o-comment-ui');
var sizzle = require('sizzle');

function NewCommentNotification () {
	var self = this;

	var activeCommentCount = 0;
	var notificationId = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

	document.body.appendChild(oCommentUi.utils.toDOM(templates.notification.render({
		id: notificationId
	})));
	var notificationElement = sizzle('#' + notificationId);
	var notificationContainer = sizzle('.o-comment-client-notification-container', notificationElement);
	var notificationCounter = sizzle('.o-comment-client-notification-counter', notificationElement);

	this.add = function (commentData) {
		activeCommentCount++;
		notificationCounter.innerHTML = activeCommentCount;

		notificationContainer.appendChild(oCommentUi.utils.toDOM(templates.notificationEntry.render({
			id: commentData.id,
			content: commentData.content,
		})));

		setTimeout(function () {
			self.remove(commentData.id);
		}, 5000);
	};

	this.remove = function (id) {
		sizzle('#o-comment-client-notification-entry-id-' + id, notificationContainer).style.display = 'none';
	};

	this.reset = function () {
		notificationElement.style.display = 'none';
		notificationContainer.innerHTML = "";
		activeCommentCount = 0;
		notificationCounter.innerHTML = activeCommentCount;
	};
}

module.exports = NewCommentNotification;
