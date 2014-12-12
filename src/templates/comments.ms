<div class="o-chat--comments-wrapper">
	<div class="o-chat--comments-area">
		<div class="o-chat--show-more o-chat--show-more-before">
			<div class="o-chat--show-more-line"></div>
			<span class="o-chat--show-more-label">Show more comments</span>
		</div>
		<ul class="o-chat--comments-container">
			{{#comments}}
				<li class="o-chat--wrapper" {{#commentId}}id="commentid-{{commentId}}"{{/commentId}} data-timestamp="{{timestamp}}">
					<span class="o-chat--timestamp">
						<time class="{{#relativeTime}}o-date{{/relativeTime}}" datetime="{{datetime}}">
							{{dateToShow}}&nbsp;
						</time>
					</span>

					<div class="o-chat--author">
						{{author.displayName}}:
					</div>

					<div class="o-chat--content">
						{{{content}}}
					</div>

					{{#adminMode}}
						<a href="#" class="o-chat--delete">Delete</a>
					{{/adminMode}}

					<div class="o-comment-ui--clear"></div>
				</li>
			{{/comments}}
		</ul>
		<div class="o-chat--show-more comment-show-more-after">
			<div class="o-chat--show-more-line"></div>
			<span class="o-chat--show-more-label">Show more comments</span>
		</div>
	</div>
</div>
