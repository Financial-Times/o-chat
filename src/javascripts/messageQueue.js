var commentUtilities = require('comment-utilities');
var oCommentData = require('o-comment-data');

var storageBaseName = "o-comment-client-comment-queue-";

exports.save = function (collectionId, commentBody) {
    "use strict";

    commentUtilities.storageWrapper.sessionStorage.setItem(storageBaseName + collectionId, commentBody);
};

exports.hasComment = function (collectionId) {
    "use strict";

    if (collectionId) {
        if (commentUtilities.storageWrapper.sessionStorage.hasItem(storageBaseName + collectionId)) {
            return true;
        }
    }

    return false;
};

exports.getComment = function (collectionId) {
    "use strict";

    if (collectionId) {
        if (exports.hasComment(collectionId)) {
            return commentUtilities.storageWrapper.sessionStorage.getItem(storageBaseName + collectionId);
        }
    }

    return undefined;
};

var commentsQueuedPosted = {};
exports.postComment = function (collectionId, callbackCommentPosted) {
    "use strict";

    if (commentsQueuedPosted[collectionId]) {
        return;
    }

    commentsQueuedPosted[collectionId] = true;


    var postCommentToCcs = function (commentBody) {
        oCommentData.api.postComment({
            collectionId: collectionId,
            commentBody: commentBody
        }, function (err, postCommentResult) {
            if (err) {
                return;
            }

            if (postCommentResult && postCommentResult.success === true) {
                if (typeof callbackCommentPosted === 'function') {
                    callbackCommentPosted({
                        commentBody: postCommentResult.bodyHtml,
                        commentId: postCommentResult.commentId,
                        createdAt: postCommentResult.createdAt
                    });
                }
            }
        });
    };

    if (exports.hasComment(collectionId)) {
        var comment = exports.getComment(collectionId);
        postCommentToCcs(comment);
    }

    exports.clear(collectionId);
};

exports.clear = function (collectionId) {
    "use strict";

    if (collectionId) {
        commentUtilities.storageWrapper.sessionStorage.removeItem(storageBaseName + collectionId);
    }
};