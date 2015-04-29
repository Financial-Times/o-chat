"use strict";

var globalEvents = require('./src/javascripts/globalEvents');
var config = require('./src/javascripts/config.js'),
	oCommentApi = require('o-comment-api'),
	defaultConfig = require('./config.json'),
	oCommentUtilities = require('o-comment-utilities');
var Widget = require('./src/javascripts/Widget.js');

/**
 * Default config (prod) is set.
 */
config.set(defaultConfig);

/**
 * Set user's session data if it's available.
 */
var userSession = oCommentUtilities.ftUser.getSession();
if (userSession) {
	config.set('sessionId', userSession);
	oCommentApi.setConfig('sessionId', userSession);
}

/**
 * Enable data caching.
 */
oCommentApi.setConfig('cache', true);



/**
 * Widget.js exposed as main constructor
 * @type {object}
 */
module.exports = Widget;

/**
 * Adds or overrides configuration options.
 *
 * @param  {string|object} keyOrObject Key or actually an object with key-value pairs.
 * @param  {anything} value Optional. Should be specified only if keyOrObject is actually a key (string).
 */
module.exports.setConfig = function () {
	config.set.apply(this, arguments);
};

module.exports.init = function (el) {
	return oCommentUtilities.initDomConstruct({
		context: el,
		classNamespace: 'o-chat',
		eventNamespace: 'oChat',
		module: module.exports
	});
};

module.exports.utilities = oCommentUtilities;
module.exports.dataService = oCommentApi;

/**
 * Enables logging.
 * @type {function}
 */
module.exports.enableLogging = function () {
	oCommentUtilities.logger.enable.apply(this, arguments);
};

/**
 * Disables logging.
 * @type {function}
 */
module.exports.disableLogging = function () {
	oCommentUtilities.logger.disable.apply(this, arguments);
};

/**
 * Sets logging level.
 * @type {number|string}
 */
module.exports.setLoggingLevel = function () {
	oCommentUtilities.logger.setLevel.apply(this, arguments);
};

document.addEventListener('o.DOMContentLoaded', function () {
	try {
		var configInDomEl = document.querySelector('script[type="application/json"][data-o-chat-config]');
		if (configInDomEl) {
			var configInDom = JSON.parse(configInDomEl.innerHTML);

			module.exports.setConfig(configInDom);
		}
	} catch (e) {
		oCommentUtilities.logger.log('Invalid config in the DOM.', e);
	}

	oCommentUtilities.initDomConstruct({
		classNamespace: 'o-chat',
		eventNamespace: 'oChat',
		module: module.exports,
		auto: true
	});
});

module.exports.on = globalEvents.on;
module.exports.off = globalEvents.off;
