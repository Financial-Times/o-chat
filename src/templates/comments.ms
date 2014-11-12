<div class="comment-comments-wrapper">
    <div class="comment-comments-area">
        <div class="comment-show-more comment-show-more-before">
            <div class="comment-show-more-line"></div>
            <span class="comment-show-more-label">Show more comments</span>
        </div>
        <ul class="comment-comments-container">
            {{#comments}}
                <li class="comment-wrapper" {{#commentId}}id="commentid-{{commentId}}"{{/commentId}} data-timestamp="{{timestamp}}">
                    <span class="comment-timestamp">
                        <time class="{{#relativeTime}}o-date{{/relativeTime}}" datetime="{{datetime}}">
                            {{dateToShow}}&nbsp;
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
                </li>
            {{/comments}}
        </ul>
        <div class="comment-show-more comment-show-more-after">
            <div class="comment-show-more-line"></div>
            <span class="comment-show-more-label">Show more comments</span>
        </div>
    </div>
</div>
