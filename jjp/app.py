
import os
import sys
import json
from werkzeug.exceptions import HTTPException
from werkzeug.routing import Map
from werkzeug.wrappers import Request, Response
from werkzeug.wsgi import SharedDataMiddleware
from sqlalchemy.orm import sessionmaker

from . import front, getdiff, models, serve
site_modules = [front, getdiff, models, serve]

class JjpApp(object):
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
        self.DbSession = sessionmaker(bind=self.db_engine)

    def run_help(self, *args):
        print 'usage:'
        for module in site_modules:
            if hasattr(module, 'commands'):
                for command in module.commands.itervalues():
                    if hasattr(command, 'help'):
                        print command.help.replace('$0', sys.argv[0])

    def run_command(self, args):
        command = args[0] if args else None
        handler = self.commands.get(command, self.run_help)
        return handler(self, *args[1:])

    def dispatch_request(self, request):
        try:
            endpoint, values = request.url_adapter.match()
            return endpoint(request, **values)
        except HTTPException as e:
            return e

    @Request.application
    def wsgi_app(self, request):
        request.app = self

        request.max_content_length = 16 * 1024 * 1024
        request.max_form_memory_size = 2 * 1024 * 1024

        request.db = self.DbSession()

        request.url_adapter = self.url_map.bind_to_environ(request.environ)

        response = self.dispatch_request(request)

        request.db.close()

        return response

    def wrap_static(self):
        self.wsgi_app = SharedDataMiddleware(self.wsgi_app, {
            '/static': os.path.join(os.path.dirname(__file__), 'static')
        })

    def __call__(self, *args):
        return self.wsgi_app(*args)
