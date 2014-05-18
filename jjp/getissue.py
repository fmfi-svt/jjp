
from werkzeug.exceptions import BadRequest
from werkzeug.routing import Rule
from .models import Users, Issues, Versions, Messages, Threads, Comments
from .utils import git_cat_content, json_response
from sqlalchemy.sql import select


def todict(dbrow):
    result = dict(dbrow.items())
    result.pop('issue_id', None)
    return result


def add_commit(request, commits, base, hash):
    if hash in commits: return
    content = git_cat_content(request, hash)
    headers, _, message = content.partition('\n\n')
    headers = headers.splitlines()

    encoding = 'utf8'
    for line in headers:
        if line.startswith('encoding '): encoding = line[9:]

    commits[hash] = headers + [message.decode(encoding)]

    if hash != base:
        for line in headers:
            if line.startswith('parent '):
                add_commit(request, commits, base, line[7:])


def get_issue(request, issue_id):
    db = request.db

    issue = db.get_one(Issues, id=issue_id)

    versions = list(db.execute(select([Versions])
        .where(Versions.c.issue_id==issue_id)
        .order_by(Versions.c.version_num)))

    messages = list(db.execute(select([Messages, Users.c.username])
        .where(Messages.c.issue_id == issue_id)
        .where(Messages.c.author_id == Users.c.id)
        .order_by(Messages.c.timestamp)))

    threads = list(db.execute(select([Threads])
        .where(Threads.c.issue_id == issue_id)
        .order_by(Threads.c.id)))

    comments = list(db.execute(select([Comments])
        .where(Comments.c.message_id == Messages.c.id)
        .where(Messages.c.issue_id == issue_id)
        .order_by(Messages.c.timestamp)))

    commits = {}
    for version in versions:
        add_commit(request, commits, version.base_hash, version.topic_hash)

    return json_response(dict(
        issue=todict(issue),
        versions=map(todict, versions),
        messages=map(todict, messages),
        threads=map(todict, threads),
        comments=map(todict, comments),
        commits=commits,
    ))


def get_routes():
    yield Rule('/<int:issue_id>.json', methods=['GET'], endpoint=get_issue)
