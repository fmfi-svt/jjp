
import os
from werkzeug.exceptions import BadRequest
from werkzeug.routing import Rule
from .fetch import fetch_remote, update_issue
from .models import Issues, Versions
from .utils import json_response, get_json_request
from .utils import needstr


# Used only as input for fetch.update_issue()
class FakeIssue(object): pass


def post_issue(request):
    # TODO: authenticate.
    # TODO: system message.
    # TODO: XSRF protection later
    # TODO: support updating issues (not just creating)

    db = request.db
    data = get_json_request(request)

    issue = FakeIssue()
    issue.title = needstr(data['title'])
    issue.upstream_branch = needstr(data['upstream_branch'])
    issue.upstream_url = needstr(data['upstream_url'])
    issue.upstream_latesthash = None
    issue.topic_branch = needstr(data['topic_branch'])
    issue.topic_url = needstr(data['topic_url'])
    issue.topic_latesthash = None
    issue.status = Issues.STATUS_OPEN

    for url in set([issue.upstream_url, issue.topic_url]):
        fetch_remote(request.app, url)
    new_upstream, new_topic, new_base = update_issue(request.app, issue)

    # Case 1: no change (branch not found)
    if not new_upstream:
        raise BadRequest("Branch not found")

    # Case 2: submitted
    if not new_base:
        raise BadRequest("Topic is already submitted upstream")

    # Case 3: new version
    issue.upstream_latesthash = new_upstream
    issue.topic_latesthash = new_topic
    issue_id = db.insert(Issues, **issue.__dict__)
    db.insert(Versions, issue_id=issue_id, version_num=1,
                        base_hash=new_base, topic_hash=new_topic)

    return json_response({ 'saved': issue_id })


def get_routes():
    yield Rule('/post/issue', methods=['POST'], endpoint=post_issue)
