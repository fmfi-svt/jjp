#!/usr/bin/env python

try:
    import jjp.local_settings as settings
except ImportError:
    import jjp.settings as settings

from jjp.app import JjpApp
application = JjpApp(settings=settings)

if __name__ == '__main__':
    import sys
    sys.exit(application.run_command(sys.argv[1:]))

# force a SyntaxError when using Python 3 by mistake
if False: print "you must use Python 2 to run this"
