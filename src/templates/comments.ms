<div class="comment-comments-area">
    <div class="comment-show-more comment-show-more-before">
        <div class="comment-show-more-line"></div>
        <span class="comment-show-more-label">Show more comments</span>
    </div>
    <div class="comment-comments-container">
        {{#comments}}
            <div class="comment-wrapper" {{#commentId}}id="commentid-{{commentId}}"{{/commentId}} data-timestamp="{{timestamp}}">
                <span class="comment-timestamp">
                    <time class="{{#relativeTime}}o-date{{/relativeTime}}" datetime="{{datetime}}">
                        {{dateToShow}}
                    </time>
                </span>

                <div class="comment-author">
                    {{author.displayName}}:
                </div>

                <div class="comment-content">
                    {{{content}}}
                </div>

                {{#adminMode}}
                    <a href="#" class="comment-delete">Delete</a>
                {{/adminMode}}

                <div class="comment-clear"></div>
            </div>
        {{/comments}}
    </div>
    <div class="comment-show-more comment-show-more-after">
        <div class="comment-show-more-line"></div>
        <span class="comment-show-more-label">Show more comments</span>
    </div>
</div>