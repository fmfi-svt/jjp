
import json
import subprocess as SP
from werkzeug.exceptions import BadRequest
from werkzeug.wrappers import Response
from werkzeug.local import get_ident


def run_git(app_or_request, *args):
    app = getattr(app_or_request, 'app', app_or_request)
    with open('/dev/null') as devnull:
        return SP.check_output(args, stdin=devnull, cwd=app.settings.git_dir)


def git_cat_file(app_or_request, object_name):
    app = getattr(app_or_request, 'app', app_or_request)
    me = get_ident()

    if not hasattr(app, '_git_cat_processes'):
        app._git_cat_processes = {}
    proc = app._git_cat_processes

    if (me not in proc) or (proc[me].poll() is not None):
        proc[me] = SP.Popen(['git', 'cat-file', '--batch'],
                            stdin=SP.PIPE, stdout=SP.PIPE,
                            cwd=app.settings.git_dir)

    proc[me].stdin.write(object_name + '\n')
    result = proc[me].stdout.readline()
    if result.endswith('missing\n'): return None
    hash, type, size = result.split()
    size = int(size)
    content = proc[me].stdout.read(size + 1)[:-1]
    return (hash, type, size, content)


def git_cat_content(app_or_request, object_name):
    if object_name == '0'*40: return ''   # special case

    result = git_cat_file(app_or_request, object_name)
    if result is None: raise KeyError(object_name)
    return result[-1]


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
