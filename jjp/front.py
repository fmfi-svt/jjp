
import json
import os
from werkzeug.routing import Rule
from werkzeug.wrappers import Response


with open(os.path.dirname(__file__) + '/front.html') as f:
    content = f.read().decode('utf-8')


def front(request):
    my_data = {}
    if request.remote_user:
        my_data['username'] = request.remote_user

    my_content = content.replace('/*INSERT*/',
        'JJP = ' + json.dumps(my_data).replace('</', '<\\/'))
    return Response(my_content, content_type='text/html; charset=UTF-8')


def die(request):
    # allows easy access to debugger on /500 if it's enabled.
    raise Exception()


def get_routes():
    yield Rule('/', methods=['GET'], endpoint=front)
    yield Rule('/500', endpoint=die)
