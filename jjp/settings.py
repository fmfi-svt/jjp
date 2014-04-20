
git_dir = './repo'

cosign_logout_prefix = ''

def db_connect():
    from sqlalchemy import create_engine
    return create_engine('sqlite:///db.sqlite')
