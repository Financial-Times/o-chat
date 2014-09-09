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