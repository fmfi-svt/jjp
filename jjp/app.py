
import os
import sys
from werkzeug.exceptions import HTTPException
from werkzeug.routing import Map
from werkzeug.wrappers import Request
from werkzeug.wsgi import SharedDataMiddleware
from .dbhelper import DbHelper

from . import fetch, front, getdiff, getissue, login, message, models, postissue, serve
site_modules = [fetch, front, getdiff, getissue, login, message, models, postissue, serve]

class JjpApp(object):
    '''The main WSGI application class.'''

    def __init__(self, settings):
        self.settings = settings

        self.commands = {}
        for module in site_modules:
            if hasattr(module, 'commands'):
                self.commands.update(module.commands)

        self.url_map = Map()
        for module in site_modules:
            if hasattr(module, 'get_routes'):
                for rulefactory in module.get_routes():
                    self.url_map.add(rulefactory)

        self.db_engine = settings.db_connect()

    def run_help(self, *args):
        '''Shows the usage when console.py is ran with an unknown command.'''
        print 'usage:'
        for module in site_modules:
            if hasattr(module, 'commands'):
                for command in module.commands.itervalues():
                    if hasattr(command, 'help'):
                        print command.help.replace('$0', sys.argv[0])

    def run_command(self, args):
        '''Used by console.py to run the command given in `args`.'''
        command = args[0] if args else None
        handler = self.commands.get(command, self.run_help)
        return handler(self, *args[1:])

    def dispatch_request(self, request):
        '''Processes the HTTP request and returns a werkzeug `Response`.'''
        try:
            endpoint, values = request.url_adapter.match()
            return endpoint(request, **values)
        except HTTPException as e:
            return e

    @Request.application
    def wsgi_app(self, request):
        '''Main WSGI entry point.

        Connects to the database and calls `dispatch_request`.
        '''
        request.app = self

        request.max_content_length = 16 * 1024 * 1024
        request.max_form_memory_size = 2 * 1024 * 1024

        request.url_adapter = self.url_map.bind_to_environ(request.environ)

        with self.db_engine.begin() as conn:
            request.db_conn = conn
            request.db = DbHelper(conn)
            response = self.dispatch_request(request)

        return response

    def wrap_static(self):
        '''Adds a "/static" route for static files.

        This should only be used for the development server. Production servers
        should expose the /static directory directly.
        '''
        self.wsgi_app = SharedDataMiddleware(self.wsgi_app, {
            '/static': os.path.join(os.path.dirname(__file__), 'static')
        })

    def wrap_dev_login(self):
        '''Adds a passwordless login form for development.'''
        self.wsgi_app = login.wrap_dev_login(self.wsgi_app)

    def __call__(self, *args):
        return self.wsgi_app(*args)
