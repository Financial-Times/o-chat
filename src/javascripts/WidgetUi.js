var commentUtilities = require('comment-utilities');
var commentUi = require('comment-ui');
var sizzle = require('sizzle');
var oDate = require('o-date');

var templates = require('./templates.js');
var utils = require('./utils.js');
var envConfig = require('./config.js');

function WidgetUi (widgetContainer, config) {
    "use strict";

    commentUi.WidgetUi.apply(this, arguments);

    config.orderType = config.orderType || "normal";

    var self = this;

    var events = new commentUtilities.Events();

    var isPagination = false;

    this.on = events.on;
    this.off = events.off;

    this.render = function (commentsData, adminMode, paginationEnabled) {
        isPagination = paginationEnabled;

        widgetContainer.innerHTML = "";

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
                        orderType: config.orderType,
                        adminMode: adminMode
                    })
                )
            );
        };

        if (config.orderType === 'inverted') {
            commentsData.reverse();
            addComments();
            addEditor();
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

        if (isPagination) {
            if (config.orderType === 'inverted') {
                sizzle('.comment-show-more-before', widgetContainer)[0].style.display = 'block';
            } else {
                sizzle('.comment-show-more-after', widgetContainer)[0].style.display = 'block';
            }

            commentUi.utils.addEventListener('click', sizzle('.comment-show-more .comment-show-more-label', widgetContainer), function () {
                events.trigger('nextPage');
            });
        }

        if (adminMode) {
            var commentContainer = sizzle('.comment-comments-container', widgetContainer);
            commentUi.utils.addEventListener('click', commentContainer, function (event) {
                if (event.target.className === 'comment-delete') {
                    try {
                        var commentId = event.target.parentNode.id.match(/commentid-([0-9]+)/)[1];

                        events.trigger('deleteComment', commentId);
                    } catch (e) {}

                    if (event.preventDefault) {
                        event.preventDefault();
                    } else {
                        event.returnValue = false;
                    }
                }
            });
        }
    };

    this.adaptToHeight = function (height) {
        var adapt = function () {
            var commentArea = sizzle('.comment-comments-area', widgetContainer)[0];
            var editorContainer = sizzle('.comment-editor-container', widgetContainer)[0];
            var editorComputedStyle = commentUi.utils.getComputedStyle(editorContainer);

            var editorContainerMarginTopValue;
            var editorContainerMarginTop = editorComputedStyle.getPropertyValue('margin-top');
            if (editorContainerMarginTop.indexOf('px') !== -1) {
                editorContainerMarginTopValue = parseInt(editorContainerMarginTop.replace('px', ''), 10);
            } else {
                editorContainerMarginTopValue = 0;
            }

            var editorContainerMarginBottomValue;
            var editorContainerMarginBottom = editorComputedStyle.getPropertyValue('margin-bottom');
            if (editorContainerMarginBottom.indexOf('px') !== -1) {
                editorContainerMarginBottomValue = parseInt(editorContainerMarginBottom.replace('px', ''), 10);
            } else {
                editorContainerMarginBottomValue = 0;
            }

            var editorHeight = editorContainer.clientHeight + editorContainerMarginTopValue + editorContainerMarginBottomValue;

            commentArea.style.overflow = "auto";
            commentArea.style.height = (height - editorHeight) + "px";
            if (config.orderType === 'inverted') {
                commentArea.scrollTop = commentArea.scrollHeight - commentArea.clientHeight;
            } else {
                commentArea.scrollTop = 0;
            }


            if (isPagination) {
                self.disableButtonPagination();

                initScrollPagination();
            }
        };

        // poll for the existence of container
        var pollForContainer = setInterval(function () {
            if (sizzle('.comment-editor-container', widgetContainer).length > 0) {
                clearInterval(pollForContainer);
                adapt();
            }
        }, 200);
    };

    function initScrollPagination () {
        var commentArea = sizzle('.comment-comments-area', widgetContainer)[0];

        var throttleTime = 200;
        var lastTime = new Date().getTime();

        var paginationScrollHandler = function () {
            if (new Date().getTime() - lastTime > throttleTime) {
                lastTime = new Date().getTime();

                if (config.orderType === 'inverted') {
                    if (commentArea.scrollTop < 0.2 * commentArea.scrollHeight) {
                        events.trigger('nextPage');
                    }
                } else {
                    if (commentArea.scrollTop + commentArea.clientHeight > 0.8 * commentArea.scrollHeight) {
                        events.trigger('nextPage');
                    }
                }
            }
        };

        commentUi.utils.addEventListener('scroll', commentArea, paginationScrollHandler);
    }

    this.disableButtonPagination = function () {
        sizzle('.comment-show-more-before', widgetContainer)[0].style.display = 'none';
        sizzle('.comment-show-more-after', widgetContainer)[0].style.display = 'none';
    };

    this.login = function (token, pseudonym, isAdmin) {
        var authEl = sizzle('.comment-editor-auth', widgetContainer);

        if (authEl && authEl.length) {
            authEl[0].innerHTML = templates.loggedIn.render({
                token: token,
                pseudonym: pseudonym.substring(0, 50),
                livefyreNetwork: envConfig.get().livefyre.network,
                isAdmin: isAdmin
            });
        }
    };

    this.logout = function () {
        var authEl = sizzle('.comment-editor-auth', widgetContainer);

        if (authEl && authEl.length) {
            authEl[0].innerHTML = templates.signIn.render();
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
            sizzle('.comment-editor-submit button', widgetContainer)[0].setAttribute('disabled', 'disabled');
        }
    };

    this.makeEditable = function () {
        var commentEditorInputContainer = sizzle('.comment-editor-input', widgetContainer);

        if (commentEditorInputContainer && commentEditorInputContainer.length) {
            commentEditorInputContainer = commentEditorInputContainer[0];

            commentEditorInputContainer.className = commentEditorInputContainer.className.replace('disabled', '');
            sizzle('textarea', commentEditorInputContainer)[0].removeAttribute('disabled');
            sizzle('.comment-editor-submit button', widgetContainer)[0].removeAttribute('disabled');
        }
    };

    // content, pseudonym, id, timestamp
    this.addComment = function (commentData, ownComment, adminMode) {
        ownComment = typeof ownComment === 'boolean' ? ownComment : false;

        var commentContainer = sizzle('.comment-comments-container', widgetContainer)[0];
        var commentArea = sizzle('.comment-comments-area', widgetContainer)[0];

        // normalize timestamp if one provided or use current time
        var timestamp = commentData.timestamp ? utils.date.toTimestamp(commentData.timestamp) : new Date();

        var scrolledToLast;

        var commentDom = commentUi.utils.toDOM(
            templates.comment.render({
                commentId: commentData.id,
                content: commentData.content,
                dateToShow: this.formatTimestamp(timestamp),
                datetime: utils.date.toISOString(timestamp),
                timestamp: utils.date.toTimestamp(timestamp),
                relativeTime: this.isRelativeTime(timestamp),
                author: {
                    displayName: commentData.displayName.substring(0, 50)
                },
                adminMode: adminMode
            })
        );


        var comments = sizzle('.comment-wrapper', commentContainer);
        var i;
        var inserted = false;

        if (config.orderType === "inverted") {
            scrolledToLast = (commentArea.scrollTop === (commentArea.scrollHeight - commentArea.clientHeight));

            for (i = comments.length-1; i >= 0; i--) {
                if (parseInt(comments[i].getAttribute('data-timestamp'), 10) < timestamp) {
                    if (i === comments.length-1) {
                        commentContainer.appendChild(commentDom);
                    } else {
                        commentContainer.insertBefore(commentDom, comments[i+1]);
                    }
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                commentContainer.insertBefore(commentDom, commentContainer.firstChild);
            }

            if (ownComment || scrolledToLast) {
                commentArea.scrollTop = commentArea.scrollHeight - commentArea.clientHeight;
            }
        } else {
            scrolledToLast = (commentContainer.scrollTop === 0);

            for (i = 0; i < comments.length; i++) {
                if (parseInt(comments[i].getAttribute('data-timestamp'), 10) < timestamp) {
                    commentContainer.insertBefore(commentDom, comments[i]);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                commentContainer.appendChild(commentDom);
            }

            if (ownComment || scrolledToLast) {
                commentArea.scrollTop = 0;
            }
        }

        if (this.isRelativeTime(timestamp)) {
            commentDom = sizzle('#commentid-' + commentData.id, widgetContainer)[0];

            var timeoutToStart = 10000;
            if (new Date().getTime() - timestamp < 0) {
                timeoutToStart += Math.abs(new Date().getTime() - timestamp);
            }

            setTimeout(function () {
                try { oDate.init(commentDom); } catch(e) {}
            }, timeoutToStart);
        }
    };

    this.addNextPageComments = function (comments, adminMode) {
        var commentContainer = sizzle('.comment-comments-container', widgetContainer)[0];
        var commentArea = sizzle('.comment-comments-area', widgetContainer)[0];

        var commentData;
        var commentDom;

        for (var index = 0; index < comments.length; index++) {
            commentData = comments[index];

            commentDom = commentUi.utils.toDOM(
                templates.comment.render({
                    commentId: commentData.commentId,
                    content: commentData.content,
                    dateToShow: this.formatTimestamp(commentData.timestamp),
                    datetime: utils.date.toISOString(commentData.timestamp),
                    timestamp: utils.date.toTimestamp(commentData.timestamp),
                    relativeTime: this.isRelativeTime(commentData.timestamp),
                    author: {
                        displayName: commentData.author.displayName.substring(0, 50)
                    },
                    adminMode: adminMode
                })
            );

            var previousScrollHeight = commentArea.scrollHeight;
            if (config.orderType === "inverted") {
                commentContainer.insertBefore(commentDom, commentContainer.firstChild);

                commentArea.scrollTop += commentArea.scrollHeight - previousScrollHeight;
            } else {
                commentContainer.appendChild(commentDom);
            }
        }
    };

    this.removeComment = function (id) {
        var comment = sizzle('#commentid-'+id, widgetContainer);
        if (comment && comment.length) {
            comment[0].parentNode.removeChild(comment[0]);
        }
    };

    this.markCommentAsDeleteInProgress = function (id) {
        var comment = sizzle('#commentid-'+id, widgetContainer);
        if (comment && comment.length) {
            comment[0].className += " deleteInProgress";
        }
    };

    this.markCommentAsDeleteInProgressEnded = function (id) {
        var comment = sizzle('#commentid-'+id, widgetContainer);
        if (comment && comment.length) {
            comment[0].className = comment[0].className.replace("deleteInProgress", "");
        }
    };

    this.getCurrentComment = function () {
        var commentArea = sizzle('.comment-editor-input textarea', widgetContainer);

        if (commentArea && commentArea.length) {
            return utils.strings.trim(commentArea[0].value).replace(/(?:\r\n|\r|\n)/g, '<br />');
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
                label: "Edit pseudonym",
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
            if (timestamp >= new Date().getTime() - 1500) {
                return "just now";
            } else {
                return oDate.timeAgo(timestamp);
            }
        } else {
            // absolute time
            return oDate.format(timestamp, config.datetimeFormat.absoluteFormat);
        }
    };

    this.isRelativeTime = function (timestampOrDate) {
        var timestamp = utils.date.toTimestamp(timestampOrDate);

        if (config.datetimeFormat.minutesUntilAbsoluteTime === -1 ||
            new Date().getTime() - timestamp > config.datetimeFormat.minutesUntilAbsoluteTime * 60 * 1000) {

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