
import json
import subprocess as SP
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
