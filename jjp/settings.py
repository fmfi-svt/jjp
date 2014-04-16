
git_dir = './repo'

def db_connect():
    from sqlalchemy import create_engine
    return create_engine('sqlite:///db.sqlite')
