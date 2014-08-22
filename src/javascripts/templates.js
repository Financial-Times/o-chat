var hogan = require('hogan');

module.exports = {
    editor: hogan.compile(requireText('../templates/editor.ms')),
    comments: hogan.compile(requireText('../templates/comments.ms')),
    comment: hogan.compile(requireText('../templates/comment.ms')),
    signIn: hogan.compile(requireText('../templates/signIn.ms'))
};