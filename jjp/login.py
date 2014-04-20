
from werkzeug.wrappers import Request, Response
from werkzeug.routing import Rule
from werkzeug.exceptions import InternalServerError
from werkzeug.utils import redirect


def login(request):
    if request.remote_user is None:
        raise InternalServerError(
            '/login is supposed to have "CosignAllowPublicAccess Off"')

    home = request.url_root
    next = request.args.get('to', home)
    return redirect(next if next and next.startswith(home) else home)


def logout(request):
    return redirect((request.app.settings.cosign_logout_prefix or '') +
                    request.url_root)


dev_login_page = '''
    <!DOCTYPE html>
    <meta charset="UTF-8">
    <title>Login</title>
    <form method="POST" style="position: absolute; left: 0; right: 0;
        top: 40%; text-align: center;">
    <p>Developer login form (testing only)</p>
    Username: <input name="username"> <input type="submit" value="Login">
    </form>
    <script>document.getElementsByTagName('input')[0].focus();</script>
'''

def wrap_dev_login(old_app):
    def new_app(environ, start_response):
        request = Request(environ)
        if request.path == '/login' and request.method == 'POST':
            response = redirect(request.url)
            response.set_cookie('username', request.form['username'])
            return response(environ, start_response)
        if request.path == '/login' and not request.cookies.get('username'):
            response = Response(dev_login_page, content_type='text/html')
            return response(environ, start_response)
        if request.path == '/logout' and request.cookies.get('username'):
            response = redirect(request.url)
            response.delete_cookie('username')
            return response(environ, start_response)
        environ['REMOTE_USER'] = request.cookies.get('username')
        if environ['REMOTE_USER'] is None: del environ['REMOTE_USER']
        return old_app(environ, start_response)
    return new_app


def get_routes():
    yield Rule('/login', endpoint=login)
    yield Rule('/logout', endpoint=logout)
