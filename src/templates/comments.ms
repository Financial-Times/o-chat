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
            <div class="comment-clear"></div>
        </div>
    {{/comments}}
</div>