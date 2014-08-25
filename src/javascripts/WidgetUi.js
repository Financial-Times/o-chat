var commentUtilities = require('comment-utilities');
var commentUi = require('comment-ui');
var sizzle = require('sizzle');
var oDate = require('o-date');

var templates = require('./templates.js');
var utils = require('./utils.js');

function WidgetUi (widgetContainer, datetimeFormat) {
    "use strict";

    commentUi.WidgetUi.apply(this, arguments);

    var self = this;

    var events = new commentUtilities.Events();

    this.on = events.on;
    this.off = events.off;

    this.orderType = "normal";

    this.render = function (commentsData, orderType) {
        this.orderType = orderType;

        var addEditor = function () {
            widgetContainer.appendChild(
                commentUi.utils.toDOM(
                    templates.editor.render({
                        submitButtonLabel: "Submit Comment",
                        termMessageTemplate: commentUi.templates.termsAndGuidelinesTemplate.render(),
                        signInTemplate: templates.signIn.render()
                    })
                )
            );
        };

        var addComments = function () {
            widgetContainer.appendChild(
                commentUi.utils.toDOM(
                    templates.comments.render({
                        comments: commentsData,
                        orderType: orderType
                    })
                )
            );
        };

        if (orderType === 'inverted') {
            commentsData.reverse();
            addComments();
            addEditor();

            var commentContainer = sizzle('.comment-container', widgetContainer)[0];
            commentContainer.scrollTop = 99999;
        } else {
            addEditor();
            addComments();
        }

        try { oDate.init(); } catch(e) {}

        commentUi.utils.addEventListener('click', sizzle('.signIn', widgetContainer)[0], function (event) {
            events.trigger('signIn');

            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
        });

        commentUi.utils.addEventListener('click', sizzle('.comment-editor-submit > button')[0], function () {
            events.trigger('postComment');
        });

        commentUi.utils.addEventListener('click', sizzle('.comment-editor-input')[0], function (event) {
            sizzle('.comment-editor-input textarea')[0].focus();
            self.clearEditorError();

            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
        });
    };

    this.login = function (pseudonym) {
        var authEl = sizzle('.comment-editor-auth', widgetContainer);

        if (authEl && authEl.length) {
            var pseudonymPlaceholder = commentUi.utils.toDOM('<span class="comment-pseudonym">' + pseudonym + '</span>');
            authEl[0].innerHTML = "";
            authEl[0].appendChild(pseudonymPlaceholder);
        }
    };

    this.logout = function () {
        var authEl = sizzle('.comment-editor-auth', widgetContainer);

        if (authEl && authEl.length) {
            authEl[0].innerHTML = templates.signIn.render();
        }
    };

    this.changePseudonym = function (pseudonym) {
        var pseudonymPlaceholder = sizzle('.comment-pseudonym', widgetContainer);

        if (pseudonymPlaceholder && pseudonymPlaceholder.length) {
            pseudonymPlaceholder[0].innerHTML = pseudonym;
        }
    };

    this.getCurrentPseudonym = function () {
        var pseudonymArea = sizzle('.comment-editor-auth .comment-pseudonym', widgetContainer);

        if (pseudonymArea && pseudonymArea.length) {
            return pseudonymArea[0].innerHTML;
        }

        return "";
    };

    this.hideSignInLink = function () {
        var authEl = sizzle('.comment-editor-auth', widgetContainer);

        if (authEl && authEl.length) {
            authEl[0].innerHTML = "";
        }
    };

    this.makeReadOnly = function () {
        var commentEditorInputContainer = sizzle('.comment-editor-input', widgetContainer);

        if (commentEditorInputContainer && commentEditorInputContainer.length) {
            commentEditorInputContainer = commentEditorInputContainer[0];

            commentEditorInputContainer.className += " disabled";
            sizzle('textarea', commentEditorInputContainer)[0].setAttribute('disabled', 'disabled');
        }
    };

    /**
     * Inserts message when authentication is not available.
     */
    this.addAuthNotAvailableMessage = function () {
        var authContainer = sizzle('.comment-editor-auth', widgetContainer);

        if (authContainer.length) {
            authContainer[0].innerHTML = commentUi.utils.toDOM(commentUi.templates.unavailableTemplate.render());
        }
    };


    this.addComment = function (content, pseudonym, id, timestamp) {
        var commentContainer = sizzle('.comment-container', widgetContainer)[0];

        var commentDom = commentUi.utils.toDOM(
            templates.comment.render({
                commentId: id,
                content: content,
                dateToShow: this.formatTimestamp(timestamp || new Date()),
                datetime: utils.date.toISOString(timestamp || new Date()),
                relativeTime: this.isRelativeTime(timestamp || new Date()),
                author: {
                    displayName: pseudonym
                }
            })
        );

        if (this.orderType === "normal") {
            commentContainer.scrollTop = 0;
            commentContainer.insertBefore(commentDom, commentContainer.firstChild);
        } else if (this.orderType === "inverted") {
            commentContainer.appendChild(commentDom);
            commentContainer.scrollTop = 99999;
        }

        if (this.isRelativeTime(timestamp || new Date())) {
            commentDom = sizzle('#commentid-' + id, widgetContainer)[0];
            try { oDate.init(commentDom); } catch(e) {}
            if (!timestamp) {
                var commentTimestampTime = sizzle('.comment-timestamp time', commentDom);
                if (commentTimestampTime && commentTimestampTime.length) {
                    commentTimestampTime[0].innerHTML = "just now";
                }
            }
        }
    };

    this.removeComment = function (id) {
        var comment = sizzle('#commentid-'+id, widgetContainer);
        if (comment && comment.length) {
            comment[0].parentNode.removeChild(comment[0]);
        }
    };

    this.getCurrentComment = function () {
        var commentArea = sizzle('.comment-editor-input textarea', widgetContainer);

        if (commentArea && commentArea.length) {
            return commentArea[0].value.replace(/(?:\r\n|\r|\n)/g, '<br />');
        }

        return "";
    };

    this.emptyCommentArea = function () {
        var commentArea = sizzle('.comment-editor-input textarea', widgetContainer);

        if (commentArea && commentArea.length) {
            commentArea[0].value = "";
        }
    };

    this.repopulateCommentArea = function (text) {
        var commentArea = sizzle('.comment-editor-input textarea', widgetContainer);

        if (commentArea && commentArea.length) {
            commentArea[0].value = text.replace(/<br \/>/g, '\n');
        }
    };

    this.addSettingsLink = function (options) {
        var loginBarContainer = sizzle('.comment-editor-auth', widgetContainer);
        if (loginBarContainer && loginBarContainer.length) {
            loginBarContainer[0].appendChild(commentUi.utils.toDOM(commentUi.templates.commentingSettingsLink.render({
                withoutSeparator: true
            })));
        } else {
            return;
        }

        var settingsLink = sizzle('.comment-settings-text', loginBarContainer[0]);
        if (settingsLink && settingsLink.length) {
            commentUi.utils.addEventListener('click', settingsLink[0], function () {
                if (options && typeof options.onClick === 'function') {
                    options.onClick();
                }
            });

            if (options && typeof options.onAdded === 'function') {
                options.onAdded();
            }
        }
    };

    this.removeSettingsLink = function () {
        var settingsLink = sizzle('.comment-settings', widgetContainer);
        if (settingsLink && settingsLink.length) {
            settingsLink[0].parentNode.removeChild(settingsLink[0]);
        }
    };

    this.setEditorError = function (err) {
        var editorErrorContainer = sizzle('.comment-editor-error', widgetContainer)[0];

        editorErrorContainer.innerHTML = err;
        editorErrorContainer.style.display = 'block';
    };

    this.clearEditorError = function () {
        var editorErrorContainer = sizzle('.comment-editor-error', widgetContainer)[0];

        editorErrorContainer.style.display = 'none';
        editorErrorContainer.innerHTML = '';
    };

    this.formatTimestamp = function (timestampOrDate) {
        var timestamp = utils.date.toTimestamp(timestampOrDate);
        var isRelative = this.isRelativeTime(timestampOrDate);

        if (isRelative) {
            // relative time
            var timeAgo = oDate.timeAgo(timestamp);
            if (timeAgo === "0 seconds ago") {
                return "just now";
            } else {
                return timeAgo;
            }
        } else {
            // absolute time
            return oDate.format(timestamp, datetimeFormat.absoluteFormat);
        }
    };

    this.isRelativeTime = function (timestampOrDate) {
        var timestamp = utils.date.toTimestamp(timestampOrDate);

        if (datetimeFormat.absoluteFormat === -1 ||
            new Date().getTime() - timestamp > datetimeFormat.minutesUntilAbsoluteTime * 60 * 1000) {

            return false;
        } else {
            return true;
        }
    };
}

WidgetUi.__extend = function(child) {
    "use strict";

    if (typeof Object.create === 'function') {
        child.prototype = Object.create(WidgetUi.prototype);
        child.prototype = Object.create(WidgetUi.prototype);
    } else {
        var Tmp = function () {};
        Tmp.prototype = WidgetUi.prototype;
        child.prototype = new Tmp();
        child.prototype.constructor = child;
    }
};

commentUi.WidgetUi.__extend(WidgetUi);

module.exports = WidgetUi;