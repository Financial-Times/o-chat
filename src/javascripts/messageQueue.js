var commentUtilities = require('comment-utilities');
var oCommentData = require('o-comment-data');

var storageBaseName = "o-comment-client-message-queue-";
var messageId = "msgQueue-" + (Math.random() + 1).toString(36).substring(7);

exports.save = function (collectionId, commentBody) {
    "use strict";

    var queueObject = {};
    if (exports.hasMessage(collectionId)) {
        queueObject = commentUtilities.storageWrapper.sessionStorage.getItem(storageBaseName + collectionId);
    }

    queueObject[messageId] = commentBody;

    commentUtilities.storageWrapper.sessionStorage.setItem(storageBaseName + collectionId, queueObject);
};

exports.hasMessage = function (collectionId) {
    "use strict";

    if (collectionId) {
        if (commentUtilities.storageWrapper.sessionStorage.hasItem(storageBaseName + collectionId)) {
            return true;
        }
    }

    return false;
};

var postCommentsInProgress = {};
exports.postComments = function (collectionId, callbackMessagePosted) {
    "use strict";

    if (postCommentsInProgress[collectionId]) {
        return;
    }

    postCommentsInProgress[collectionId] = true;

    var queueObject = {};
    if (exports.hasMessage(collectionId)) {
        queueObject = commentUtilities.storageWrapper.sessionStorage.getItem(storageBaseName + collectionId);
    }

    var postCommentToCcs = function (commentBody) {
        oCommentData.api.postComment({
            collectionId: collectionId,
            commentBody: commentBody
        }, function (err, postCommentResult) {
            if (err) {
                return;
            }

            if (postCommentResult && postCommentResult.success === true) {
                if (typeof callbackMessagePosted === 'function') {
                    callbackMessagePosted();
                }
            }
        });
    };

    var id;
    for (id in queueObject) {
        if (queueObject.hasOwnProperty(id)) {
            postCommentToCcs(queueObject[id]);
        }
    }

    exports.clear(collectionId);
};

exports.clear = function (collectionId) {
    "use strict";

    if (collectionId) {
        commentUtilities.storageWrapper.sessionStorage.removeItem(storageBaseName + collectionId);
    }
};