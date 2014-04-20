
from sqlalchemy import (MetaData, Table, Column, ForeignKey, Integer, String, Boolean, UnicodeText, func)


metadata = MetaData()


Users = Table('users', metadata,
    Column('id', Integer, primary_key=True),
    Column('username', String(255), nullable=False, index=True, unique=True),
)

Issues = Table('issues', metadata,
    Column('id', Integer, primary_key=True),
    Column('title', UnicodeText, nullable=False),
    Column('upstream_branch', String(255), nullable=False),
    Column('upstream_url', String(255), nullable=False),
    Column('upstream_latesthash', String(255), nullable=False),
    Column('topic_branch', String(255), nullable=False),
    Column('topic_url', String(255), nullable=False),
    Column('topic_latesthash', String(255), nullable=False),
    Column('status', Integer, nullable=False, index=True),
)
Issues.STATUS_OPEN = 0
Issues.STATUS_SUBMITTED = 1
Issues.STATUS_ABANDONED = 2

Versions = Table('versions', metadata,
    Column('issue_id', Integer, ForeignKey('issues.id'), index=True, primary_key=True, autoincrement=False),
    Column('version_num', Integer, nullable=False, primary_key=True, autoincrement=False),
    Column('base_hash', String(255), nullable=False),
    Column('topic_hash', String(255), nullable=False),
)

Messages = Table('messages', metadata,
    Column('id', Integer, nullable=False, primary_key=True),
    Column('issue_id', Integer, ForeignKey('issues.id'), nullable=False, index=True),
    Column('author_id', Integer, ForeignKey('users.id'), nullable=False),
    Column('timestamp', Integer, nullable=False, index=True, default=func.now()),
)

Threads = Table('threads', metadata,
    Column('id', Integer, nullable=False, primary_key=True),
    Column('issue_id', Integer, ForeignKey('issues.id'), nullable=False, index=True),
    Column('diff_from', String(255)),
    Column('diff_to', String(255)),
    Column('diff_side', Integer),
    Column('file', String(255)),
    Column('line', Integer),
    Column('resolved', Boolean, nullable=False),
)

Comments = Table('comments', metadata,
    Column('message_id', Integer, ForeignKey('messages.id'), primary_key=True),
    Column('thread_id', Integer, ForeignKey('threads.id'), primary_key=True),
    Column('body', UnicodeText, nullable=False),
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
