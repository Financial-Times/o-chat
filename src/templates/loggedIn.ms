<div class="comment-loggedin">
	<span class="comment-pseudonym">{{pseudonym}}</span>
	{{#isAdmin}}
		<ul class="comment-admin-links">
			<li><a href="http://admin.{{livefyreNetwork}}/admin/comments/?lftoken={{token}}" target="_blank">Admin console</a></li>
		</ul>
	{{/isAdmin}}
</div>
