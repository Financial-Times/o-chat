"use strict";

var oCommentUi = require('o-comment-ui');
var oCommentApi = require('o-comment-api');
var oOverlay = require('o-overlay');

/**
 * Shows a dialog for setting the initial pseudonym (shown when the user doesn't have a pseudonym set).
 * @param  {Function} callbacks Optional. Two possible fields: success and failure. Success will get the new authentication data as parameter.
 */
exports.showSetPseudonymDialog = function (callbacks) {
	if (!callbacks || typeof callbacks !== 'object') {
		callbacks = {};
	}

	callbacks.success = callbacks.success || function () {};
	callbacks.failure = callbacks.failure || function () {};

	oCommentUi.userDialogs.showSetPseudonymDialog({
		submit: function (formData, responseCallback) {
			if (formData && formData.pseudonym) {
				oCommentApi.api.updateUser({
					pseudonym: formData.pseudonym
				}, function (err) {
					if (err) {
						if (typeof err === 'object' && err.sudsError) {
							if (oCommentUi.i18n.serviceMessageOverrides.hasOwnProperty(err.error)) {
								responseCallback(oCommentUi.i18n.serviceMessageOverrides[err.error]);
							} else {
								responseCallback(err.error);
							}
						} else {
							responseCallback(oCommentUi.i18n.texts.changePseudonymError);
						}

						return;
					}


					oCommentApi.api.getAuth({
						force: true
					}, function (err, authData) {
						if (err) {
							responseCallback(oCommentUi.i18n.texts.changePseudonymError);
							callbacks.failure();
							return;
						}

						callbacks.success(authData);
						responseCallback();
					});
				});
			} else {
				responseCallback(oCommentUi.i18n.texts.changePseudonymBlankError);
			}
		},
		close: function () {
			callbacks.failure();
		}
	});
};

/**
 * Settings dialog where the user can change its pseudonym or email preferences.
 * @param  {Object} currentPseudonym Required. Current pseudonym of the user.
 * @param  {Function} callbacks Optional. Two possible fields: success and failure. Success will get the new authentication data as parameter.
 */
exports.showChangePseudonymDialog = function (currentPseudonym, callbacks) {
	if (!callbacks || typeof callbacks !== 'object') {
		callbacks = {};
	}

	callbacks.success = callbacks.success || function () {};
	callbacks.failure = callbacks.failure || function () {};

	oCommentUi.userDialogs.showChangePseudonymDialog(currentPseudonym, {
		submit: function (formData, responseCallback) {
			if (formData) {
				oCommentApi.api.updateUser(formData, function (err) {
					if (err) {
						if (typeof err === 'object' && err.sudsError) {
							if (oCommentUi.i18n.serviceMessageOverrides.hasOwnProperty(err.error)) {
								responseCallback(oCommentUi.i18n.serviceMessageOverrides[err.error]);
							} else {
								responseCallback(err.error);
							}
						} else {
							responseCallback(oCommentUi.i18n.texts.genericError);
						}

						return;
					}

					oCommentApi.api.getAuth({
						force: true
					}, function (err, authData) {
						if (err) {
							callbacks.failure();
							responseCallback(oCommentUi.i18n.texts.genericError);
							return;
						}

						callbacks.success(authData);
						responseCallback();
					});
				});
			} else {
				responseCallback(oCommentUi.i18n.texts.genericError);
			}
		},
		close: function () {
			callbacks.failure();
		}
	});
};

/**
 * Shows a dialog with a sign in link to re-login after a session expire.
 * @param  {Object} callbacks Object with callback functions. Possible fields:
 *                                - submit: Required. Function that is called when the form is submitted
 *                                - close:  Optional. Function that is called when the dialog is closed.
 */
exports.showInactivityMessage = oCommentUi.userDialogs.showInactivityMessage;


/**
 * Shows a message to the user in a dialog (not modal).
 * @param  {String} title   Title of the dialog
 * @param  {String} message The content of the dialog (the message).
 */
exports.showMessage = function (title, message) {
	var idOfTheOverlay = "oChat_showMessage";
	var overlay = new oOverlay(idOfTheOverlay, {
		html: message,
		heading: {
			title: title
		},
		modal: false
	});

	overlay.open();
};
