var commentUtilities = require('comment-utilities');
var oCommentData = require('o-comment-data');


/**
 * Base name for the message queue session storage container, which is completed with the collectionId.
 * @type {String}
 */
var storageBaseName = "o-comment-client-comment-queue-";

/**
 * MessageQueue saves a message to the session storage to preserve it
 * after a page reload.
 * @param {Number|String} collectionId Collection ID.
 */
function MessageQueue (collectionId) {
    "use strict";

    if (typeof collectionId === "undefined") {
        throw "Collection ID not provided.";
    }

    /**
     * Saves a comment to the session storage.
     * @param  {String} commentBody  Body of the comment
     */
    this.save = function (commentBody) {
        commentUtilities.storageWrapper.sessionStorage.setItem(storageBaseName + collectionId, commentBody);
    };

    /**
     * Verifies if the collectionId has a comment.
     * @return {Boolean}
     */
    this.hasComment = function () {
        if (commentUtilities.storageWrapper.sessionStorage.hasItem(storageBaseName + collectionId)) {
            return true;
        }

        return false;
    };

    this.getComment = function () {
        if (this.hasComment(collectionId)) {
            return commentUtilities.storageWrapper.sessionStorage.getItem(storageBaseName + collectionId);
        }

        return undefined;
    };

    var commentsQueuePosted = false;
    this.postComment = function (callbackCommentPosted) {
        if (commentsQueuePosted) {
            return;
        }

        commentsQueuePosted = true;


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

        if (this.hasComment()) {
            var comment = this.getComment();
            postCommentToCcs(comment);
        }

        this.clear();
    };

    this.clear = function () {
        commentUtilities.storageWrapper.sessionStorage.removeItem(storageBaseName + collectionId);
    };
}
module.exports = MessageQueue;