"use strict";

exports.on = function (eventName, eventHandler) {
	document.body.addEventListener('oChat.' + eventName, eventHandler);
};

exports.off = function (eventName, eventHandler) {
	document.body.removeEventListener('oChat.' + eventName, eventHandler);
};

exports.trigger = function (eventName, data) {
	document.body.dispatchEvent(new CustomEvent('oChat.' + eventName, {
		detail: data,
		bubbles: true
	}));
};
