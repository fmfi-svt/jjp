
import json
import subprocess as SP
from werkzeug.exceptions import BadRequest
from werkzeug.wrappers import Response


def run_git(request, *args):
    git_dir = request.app.settings.git_dir
    with open('/dev/null') as devnull:
        return SP.check_output(args, stdin=devnull, cwd=git_dir)


def json_response(json_object):
    return Response(json.dumps(json_object),
                    content_type='application/json; charset=UTF-8')


def get_json_request(request):
    return json.loads(request.get_data())
    # TODO: perhaps wrap dicts to throw BadRequestKeyError.


# Helper functions for input data validation.
def _need(type):
    def fn(value):
        if not isinstance(value, type): raise BadRequest()
        return value
    return fn
needbool = _need(bool)
needdict = _need(dict)
needint = _need((int, long))
needlist = _need(list)
needstr = _need(unicode)
