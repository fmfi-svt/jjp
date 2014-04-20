
def serve(app, *args):
    if list(args) == ['--debug']:
        debug = True
    elif list(args) == []:
        debug = False
    else:
        raise ValueError('wrong args')

    import os
    from werkzeug.serving import run_simple

    app.wrap_static()
    app.wrap_dev_login()
    run_simple('127.0.0.1', os.getenv('PORT') or 5000, app,
               use_debugger=debug, use_reloader=True)

serve.help = '  $0 serve [--debug]'


commands = {
    'serve': serve,
}
