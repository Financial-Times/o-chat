var config = require('./src/javascripts/config.js'),
    oCommentData = require('o-comment-data'),
    defaultConfig = require('./config.json'),
    commentUtilities = require('comment-utilities');

/**
 * Default config (prod) is set.
 */
config.set(defaultConfig);

/**
 * Enable data caching.
 */
oCommentData.init('cache', true);

module.exports = {
    /**
     * Adds or overrides configuration options. It also supports overriding or adding configs to dependencies.
     * For this you have to write the following:
     * ```
     * "dependencies": {
     *       "o-comment-data": {
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
    init: function (keyOrObject, value) {
        "use strict";

        if (typeof keyOrObject === 'string') {
            config.set(keyOrObject, value);

            if (keyOrObject === 'sessionId') {
                oCommentData.init(keyOrObject, value);
            }
        } else if (typeof keyOrObject === 'object') {
            if (keyOrObject.hasOwnProperty('dependencies') && keyOrObject.dependencies.hasOwnProperty('o-comment-data')) {
                oCommentData.init(keyOrObject.dependencies['o-comment-data']);

                delete keyOrObject.dependencies;
            }

            config.set(keyOrObject, value);

            if (keyOrObject.hasOwnProperty('sessionId')) {
                oCommentData.init('sessionId', keyOrObject.sessionId);
            }
        }
    },
    
    /**
     * Widget.js exposed.
     * @type {object}
     */
    Widget: require('./src/javascripts/Widget.js'),

    WidgetUi: require('./src/javascripts/WidgetUi.js'),

    userDialogs: require('./src/javascripts/userDialogs.js'),

    templates: require('./src/javascripts/templates.js'),

    auth: require('./src/javascripts/auth.js'),

    MessageQueue: require('./src/javascripts/MessageQueue.js'),

    utilities: commentUtilities,
    dataService: oCommentData,

    /**
     * Enables logging.
     * @type {function}
     */
    enableLogging: function () {
        "use strict";
        commentUtilities.logger.enable.apply(this, arguments);
    },

    /**
     * Disables logging.
     * @type {function}
     */
    disableLogging: function () {
        "use strict";
        commentUtilities.logger.disable.apply(this, arguments);
    },

    /**
     * Sets logging level.
     * @type {number|string}
     */
    setLoggingLevel: function () {
        "use strict";
        commentUtilities.logger.setLevel.apply(this, arguments);
    }
};