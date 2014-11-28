"use strict";

var oCommentUtilities = require('o-comment-utilities');
var userDialogs = require('./userDialogs');
var oCommentApi = require('o-comment-api');
var globalEvents = require('./globalEvents.js');



/**
 * Auth is responsible to handle login and logout requests and broadcast these requests.
 */
function Auth () {
	var self = this;

	/**
	 * Pseudonym is still missing.
	 * @type {Boolean}
	 */
	this.pseudonymMissing = false;

	/**
	 * Tries to obtain the user's login data. Calls a callback with the resulted status,
	 * and also fires an event if the user can be logged in.
	 * @param  {Function} callback Called with two parameters: loginStatus, authData.
	 */
	this.login = function (callback) {
		if (typeof callback !== 'function') {
			callback = function () {};
		}

		oCommentApi.api.getAuth(function (err, authData) {
			if (err) {
				callback(false);
				return;
			}

			if (authData) {
				if (authData.token) {
					callback(true, authData);
					globalEvents.trigger('auth.login', authData);
				} else if (authData.pseudonym === false) {
					// the user doesn't have pseudonym

					self.pseudonymMissing = true;
					callback(false, authData);
				} else {
					callback(false, authData);
				}
			} else {
				callback(false);
			}
		});
	};

	/**
	 * Broadcasts a logout event.
	 */
	this.logout = function () {
		globalEvents.trigger('auth.logout');
	};

	/**
	 * Login required and pseudonym is missing
	 * @param  {[type]} delegate Has two functions: success and failure. The appropriate function will be called.
	 */
	function loginRequiredPseudonymMissing (delegate) {
		oCommentUtilities.logger.log('pseudonymMissing');

		userDialogs.showSetPseudonymDialog({
			success: function (authData) {
				if (authData && authData.token) {
					self.login(authData.token, authData.displayName, authData.isAdmin || authData.isModerator);
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
	 * @param  {[type]} delegate Has two functions: success and failure. The appropriate function will be called.
	 */
	function loginRequiredAfterASuccess (delegate) {
		oCommentApi.api.getAuth({
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
	 * @param  {[type]} delegate Has two functions: success and failure. The appropriate function will be called.
	 */
	this.loginRequired = function (delegate, force) {
		oCommentApi.api.getAuth({
			force: force
		}, function (err, authData) {
			if (authData && authData.pseudonym === false) {
				loginRequiredPseudonymMissing(delegate);
			} else if (!authData || !authData.token) {
				globalEvents.trigger('authAction.loginRequired', {
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
				self.login(authData.token, authData.displayName, authData.isAdmin || authData.isModerator);

				if (delegate && delegate.success) {
					delegate.success();
				}
			}
		});
	};
}

/**
 * Export a single instance.
 * @type {Auth}
 */
module.exports = new Auth();
