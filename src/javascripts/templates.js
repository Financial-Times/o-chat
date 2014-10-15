"use strict";

var hogan = require('hogan');

/**
 * List of the templates available.
 * @type {Object}
 */
module.exports = {
    editor: hogan.compile(requireText('../templates/editor.ms')),
    comments: hogan.compile(requireText('../templates/comments.ms')),
    comment: hogan.compile(requireText('../templates/comment.ms')),
    signIn: hogan.compile(requireText('../templates/signIn.ms')),
    loggedIn: hogan.compile(requireText('../templates/loggedIn.ms'))
};