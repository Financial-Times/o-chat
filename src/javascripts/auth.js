var commentUtilities = require('comment-utilities');

/**
 * Auth is responsible to handle login and logout requests and broadcast these requests.
 */
function Auth () {
    "use strict";

    var event = new commentUtilities.Events();

    this.on = event.on;
    this.off = event.off;

    /**
     * Pseudonym is still missing.
     * @type {Boolean}
     */
    this.pseudonymMissing = false;

    /**
     * Pseudonym was missing since the page was loaded and only 1 comment was posted.
     * @type {Boolean}
     */
    this.pseudonymWasMissing = false;

    /**
     * Broadcasts a login request.
     */
    this.login = function (token, pseudonym) {
        event.trigger('login.auth', [token, pseudonym]);
    };

    /**
     * Broadcasts a logout request.
     */
    this.logout = function () {
        event.trigger('logout.auth');
    };
}


var instance;
module.exports = {
    getInstance: function () {
        "use strict";

        if (typeof instance !== 'undefined') {
            return instance;
        }

        instance = new Auth();
        return instance;
    }
};