
from sqlalchemy import (MetaData, Table, Column, ForeignKey, Integer, String, Boolean, UnicodeText, func)


metadata = MetaData()


Users = Table('users', metadata,
    Column('id', Integer, primary_key=True),
    Column('username', String(255), nullable=False, index=True),
)

Reviews = Table('reviews', metadata,
    Column('id', Integer, primary_key=True),
    Column('title', UnicodeText, nullable=False),
    Column('upstream', String(255), nullable=False),   # TODO: remote url?
    Column('branch', String(255), nullable=False),   # TODO: remote url.
    Column('status', Integer, nullable=False),
)

Versions = Table('versions', metadata,
    Column('review_id', Integer, ForeignKey('reviews.id'), index=True, primary_key=True, autoincrement=False),
    Column('version_num', Integer, nullable=False, primary_key=True, autoincrement=False),
    Column('upstream_hash', String(255), nullable=False),
    Column('branch_hash', String(255), nullable=False),
)

Messages = Table('messages', metadata,
    Column('id', Integer, nullable=False, primary_key=True),
    Column('review_id', Integer, ForeignKey('reviews.id'), nullable=False, index=True),
    Column('author_id', Integer, ForeignKey('users.id'), nullable=False),
)

Threads = Table('threads', metadata,
    Column('id', Integer, nullable=False, primary_key=True),
    Column('review_id', Integer, ForeignKey('reviews.id'), nullable=False, index=True),
    Column('diff_from', String(255)),
    Column('diff_to', String(255)),
    Column('diff_side', Integer),
    Column('file', String(255)),
    Column('line', Integer),
    Column('resolved', Boolean, nullable=False),
)

Comments = Table('comments', metadata,
    Column('id', Integer, nullable=False, primary_key=True),
    Column('message_id', Integer, ForeignKey('messages.id'), nullable=False, index=True),
    Column('thread_id', Integer, ForeignKey('threads.id'), nullable=False, index=True),
    Column('body', UnicodeText, nullable=False),
    Column('timestamp', Integer, nullable=False, index=True, default=func.now()),
)


def initschema(app):
    metadata.create_all(app.db_engine)
initschema.help = '  $0 initschema'


def droptables(app, *args):
    if list(args) != ['--delete-everything']:
        raise ValueError("must use --delete-everything")
    metadata.drop_all(app.db_engine)
droptables.help = '  $0 droptables --delete-everything'


commands = {
    'initschema': initschema,
    'droptables': droptables,
}
