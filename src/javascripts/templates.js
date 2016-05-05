const oCommentUi = require('o-comment-ui');

/**
 * List of the templates available.
 * @type {Object}
 */
module.exports = {
	editor: oCommentUi.templatingEngine.compile(require('../templates/editor.html')),
	comments: oCommentUi.templatingEngine.compile(require('../templates/comments.html')),
	comment: oCommentUi.templatingEngine.compile(require('../templates/comment.html')),
	signIn: oCommentUi.templatingEngine.compile(require('../templates/signIn.html')),
	loggedIn: oCommentUi.templatingEngine.compile(require('../templates/loggedIn.html')),
	notification: oCommentUi.templatingEngine.compile(require('../templates/notification.html'))
};
