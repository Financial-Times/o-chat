const hogan = require('hogan');

/**
 * List of the templates available.
 * @type {Object}
 */
module.exports = {
	editor: hogan.compile(require('../templates/editor.html')),
	comments: hogan.compile(require('../templates/comments.html')),
	comment: hogan.compile(require('../templates/comment.html')),
	signIn: hogan.compile(require('../templates/signIn.html')),
	loggedIn: hogan.compile(require('../templates/loggedIn.html')),
	notification: hogan.compile(require('../templates/notification.html'))
};
