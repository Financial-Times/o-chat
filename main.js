"use strict";

var self = module;
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

module.exports = {
	/**
	 * Adds or overrides configuration options. It also supports overriding or adding configs to dependencies.
	 * For this you have to write the following:
	 * ```
	 * "dependencies": {
	 *       "o-comment-api": {
	 *           "ccs": {
	 *               "baseUrl": "http://test.comment-creation-service.webservices.ft.com"
	 *           }
	 *       }
	 *   }
	 * ```
	 *
	 * @param  {string|object} keyOrObject Key or actually an object with key-value pairs.
	 * @param  {anything} value Optional. Should be specified only if keyOrObject is actually a key (string).
	 */
	setConfig: function (keyOrObject, value) {
		if (typeof keyOrObject === 'string') {
			config.set(keyOrObject, value);
		} else if (typeof keyOrObject === 'object') {
			if (keyOrObject.hasOwnProperty('dependencies') && keyOrObject.dependencies.hasOwnProperty('o-comment-api')) {
				oCommentApi.setConfig(keyOrObject.dependencies['o-comment-api']);

				delete keyOrObject.dependencies;
			}

			config.set(keyOrObject, value);
		}
	},

	/**
	 * Widget.js exposed.
	 * @type {object}
	 */
	Widget: Widget,

	WidgetUi: require('./src/javascripts/WidgetUi.js'),

	userDialogs: require('./src/javascripts/userDialogs.js'),

	templates: require('./src/javascripts/templates.js'),

	auth: require('./src/javascripts/auth.js'),

	MessageQueue: require('./src/javascripts/MessageQueue.js'),

	utilities: oCommentUtilities,
	dataService: oCommentApi,

	init: function (el) {
		return oCommentUtilities.initDomConstruct({
			context: el,
			Widget: Widget,
			baseClass: 'o-chat',
			namespace: 'oChat',
			module: self
		});
	},

	/**
	 * Enables logging.
	 * @type {function}
	 */
	enableLogging: function () {
		oCommentUtilities.logger.enable.apply(this, arguments);
	},

	/**
	 * Disables logging.
	 * @type {function}
	 */
	disableLogging: function () {
		oCommentUtilities.logger.disable.apply(this, arguments);
	},

	/**
	 * Sets logging level.
	 * @type {number|string}
	 */
	setLoggingLevel: function () {
		oCommentUtilities.logger.setLevel.apply(this, arguments);
	}
};

document.addEventListener('o.DOMContentLoaded', function () {
	oCommentUtilities.initDomConstruct({
		Widget: Widget,
		baseClass: 'o-chat',
		namespace: 'oChat',
		module: self,
		auto: true
	});
});

module.exports.on = globalEvents.on;
module.exports.off = globalEvents.off;
