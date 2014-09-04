var commentUtilities = require('comment-utilities');
var userDialogs = require('./userDialogs');
var oCommentData = require('o-comment-data');




/**
 * Auth is responsible to handle login and logout requests and broadcast these requests.
 */
function Auth () {
    "use strict";

    var self = this;

    var event = new commentUtilities.Events();

    this.on = event.on;
    this.off = event.off;

    /**
     * Pseudonym is still missing.
     * @type {Boolean}
     */
    this.pseudonymMissing = false;

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

    /**
     * Login required and pseudonym is missing
     * @param  {[type]} delegate [description]
     * @return {[type]}          [description]
     */
    function loginRequiredPseudonymMissing (delegate) {
        commentUtilities.logger.log('pseudonymMissing');

        userDialogs.showSetPseudonymDialog({
            success: function (authData) {
                if (authData && authData.token) {
                    self.login(authData.token, authData.displayName);
                }

                if (delegate && delegate.success) {
                    delegate.success();
                }
            },
            failure: function () {
                if (delegate && delegate.failure) {
                    delegate.failure();
                }
            }
        });
    }

    /**
     * Login required, first attempt of the login process is successful.
     * If the user is still not logged in, then fail.
     * If the user has no pseudonym, ask for a pseudonym.
     * @param  {[type]} delegate [description]
     * @return {[type]}          [description]
     */
    function loginRequiredAfterASuccess (delegate) {
        oCommentData.api.getAuth({
            force: true
        }, function (err, authData) {
            if (authData && authData.pseudonym === false) {
                loginRequiredPseudonymMissing(delegate);
            } else {
                if (delegate && delegate.failure) {
                    delegate.failure();
                }
            }
        });
    }

    /**
     * Login is required.
     * If pseudonym is missing, ask for a pseudonym.
     * If there is no known method to login the user, generate a `loginRequired.authAction` event that can be handled at the integration level.
     * If successful, check if the user is logged in.
     * @param  {[type]} delegate [description]
     * @return {[type]}          [description]
     */
    this.loginRequired = function (delegate) {
        oCommentData.api.getAuth(function (err, authData) {
            if (authData && authData.pseudonym === false) {
                loginRequiredPseudonymMissing(delegate);
            } else if (!authData || !authData.token) {
                event.trigger('loginRequired.authAction', {
                    success: function () {
                        loginRequiredAfterASuccess(delegate);
                    },
                    failure: function () {
                        if (delegate && delegate.failure) {
                            delegate.failure();
                        }
                    }
                });
            } else {
                self.login(authData.token, authData.displayName);
                
                if (delegate && delegate.success) {
                    delegate.success();
                }
            }
        });
    };
}


module.exports = new Auth();