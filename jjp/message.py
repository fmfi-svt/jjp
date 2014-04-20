
from werkzeug.exceptions import BadRequest, Forbidden
from werkzeug.routing import Rule
from .models import Users, Issues, Messages, Threads, Comments
from .utils import json_response, get_json_request
from .utils import needbool, needdict, needint, needlist, needstr


def post_message(request):
    if not request.remote_user: raise Forbidden()
    # TODO: XSRF protection later

    db = request.db
    data = get_json_request(request)

    issue_id = needint(data['issue_id'])
    db.get_one(Issues, id=issue_id)   # verify it exists
    author_id = db.get_one(Users, username=request.remote_user).id
    message_id = db.insert(Messages, issue_id=issue_id, author_id=author_id)

    for comment in needlist(data['comments']):
        if 'id' in comment:
            thread_id = needint(comment['id'])
            if db.get_one(Threads, id=thread_id).issue_id != issue_id:
                raise BadRequest('invalid thread_id')
            db.update(Threads, dict(id=thread_id),
                      resolved=needbool(comment['resolved']))
        elif 'file' in comment:
            thread_id = db.insert(Threads,
                issue_id=issue_id,
                diff_from=needstr(comment['diff_from']),
                diff_to=needstr(comment['diff_to']),
                diff_side=needint(comment['diff_side']),
                file=needstr(comment['file']),
                line=needint(comment['line']),
                resolved=needbool(comment['resolved']))
        else:
            thread_id = db.insert(Threads,
                issue_id=issue_id,
                resolved=needbool(comment['resolved']))

        db.insert(Comments, message_id=message_id, thread_id=thread_id,
                  body=needstr(comment['body']))

    return json_response({})


def get_routes():
    yield Rule('/post/message', methods=['POST'], endpoint=post_message)
