const on = function (eventName, eventHandler) {
	document.body.addEventListener('oChat.' + eventName, eventHandler);
};
exports.on = function (eventName, eventHandler) {
	if (document.body) {
		on(eventName, eventHandler);
	} else {
		document.addEventListener('o.DOMContentLoaded', function () {
			on(eventName, eventHandler);
		});
	}
};

const off = function (eventName, eventHandler) {
	document.body.removeEventListener('oChat.' + eventName, eventHandler);
};
exports.off = function (eventName, eventHandler) {
	if (document.body) {
		off(eventName, eventHandler);
	} else {
		document.addEventListener('o.DOMContentLoaded', function () {
			off(eventName, eventHandler);
		});
	}
};


const trigger = function (eventName, data) {
	document.body.dispatchEvent(new CustomEvent('oChat.' + eventName, {
		detail: data,
		bubbles: true
	}));
};
exports.trigger = function (eventName, data) {
	if (document.body) {
		trigger(eventName, data);
	} else {
		document.addEventListener('o.DOMContentLoaded', function () {
			trigger(eventName, data);
		});
	}
};
