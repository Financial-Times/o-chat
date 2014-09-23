var commentUi = require('comment-ui');
var oCommentData = require('o-comment-data');

exports.showSetPseudonymDialog = function (callbacks) {
    "use strict";

    if (!callbacks || typeof callbacks !== 'object') {
        callbacks = {};
    }

    callbacks.success = callbacks.success || function () {};
    callbacks.failure = callbacks.failure || function () {};

    commentUi.userDialogs.showSetPseudonymDialog({
        submit: function (formData, responseCallback) {
            if (formData && formData.pseudonym) {
                oCommentData.api.updateUser({
                    pseudonym: formData.pseudonym
                }, function (err) {
                    if (err) {
                        if (typeof err === 'object' && err.sudsError) {
                            if (commentUi.i18n.serviceMessageOverrides.hasOwnProperty(err.error)) {
                                responseCallback(commentUi.i18n.serviceMessageOverrides[err.error]);
                            } else {
                                responseCallback(err.error);
                            }
                        } else {
                            responseCallback(commentUi.i18n.texts.changePseudonymError);
                        }
                        
                        return;
                    }


                    oCommentData.api.getAuth({
                        force: true
                    }, function (err, authData) {
                        if (err) {
                            responseCallback(commentUi.i18n.texts.changePseudonymError);
                            callbacks.failure();
                            return;
                        }

                        callbacks.success(authData);
                        responseCallback();
                    });
                });
            } else {
                responseCallback(commentUi.i18n.texts.changePseudonymBlankError);
            }
        },
        close: function () {
            callbacks.failure();
        }
    });
};

exports.showChangePseudonymDialog = function (currentPseudonym, callbacks) {
    "use strict";

    if (!callbacks || typeof callbacks !== 'object') {
        callbacks = {};
    }

    callbacks.success = callbacks.success || function () {};
    callbacks.failure = callbacks.failure || function () {};

    commentUi.userDialogs.showChangePseudonymDialog(currentPseudonym, {
        submit: function (formData, responseCallback) {
            if (formData) {
                oCommentData.api.updateUser(formData, function (err) {
                    if (err) {
                        if (typeof err === 'object' && err.sudsError) {
                            if (commentUi.i18n.serviceMessageOverrides.hasOwnProperty(err.error)) {
                                responseCallback(commentUi.i18n.serviceMessageOverrides[err.error]);
                            } else {
                                responseCallback(err.error);
                            }
                        } else {
                            responseCallback(commentUi.i18n.texts.genericError);
                        }
                        
                        return;
                    }

                    oCommentData.api.getAuth({
                        force: true
                    }, function (err, authData) {
                        if (err) {
                            callbacks.failure();
                            responseCallback(commentUi.i18n.texts.genericError);
                            return;
                        }

                        callbacks.success(authData);
                        responseCallback();
                    });
                });
            } else {
                responseCallback(commentUi.i18n.texts.genericError);
            }
        },
        close: function () {
            callbacks.failure();
        }
    });
};


exports.showInactivityMessage = commentUi.userDialogs.showInactivityMessage;

exports.showMessage = function (title, message) {
    "use strict";

    var dialog = new commentUi.dialog.Dialog(message, {
        modal: false,
        title: title
    });
    dialog.open();
};