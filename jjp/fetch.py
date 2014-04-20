
import os
import sys
from hashlib import sha1
from sqlalchemy.sql import select
from .dbhelper import DbHelper
from .models import Issues, Versions
from .utils import run_git, git_cat_file


def url_hash(url):
    return sha1(url).hexdigest()


def fetch_remote(app, url):
    if url.startswith('-'):
        raise ValueError("URL starts with -")
    run_git(app, 'git', 'fetch', '--prune', url,
                 '+refs/heads/*:refs/remotes/%s/*' % url_hash(url))


def get_hash(app, url, branch):
    res = git_cat_file(app, 'refs/remotes/%s/%s' % (url_hash(url), branch))
    return res[0] if res else None


def update_issue(app, issue):
    new_upstream = get_hash(app, issue.upstream_url, issue.upstream_branch)
    new_topic = get_hash(app, issue.topic_url, issue.topic_branch)
    if (new_upstream == issue.upstream_latesthash and
        new_topic == issue.topic_latesthash):
        return (None, None, None)   # case 1: no change

    if not new_upstream or not new_topic:
        # A branch has disappeared.
        # TODO: Don't create a new version, but make a system message.
        return (None, None, None)   # case 1: no change

    new_base = run_git(app, 'git', 'merge-base', new_upstream, new_topic)
    new_base = new_base.strip()
    if new_base == new_topic:
        return (new_upstream, new_topic, None)   # case 2: submitted

    return (new_upstream, new_topic, new_base)   # case 3: new version


def do_cron(app, db):
    issues = list(db.select(Issues, status=Issues.STATUS_OPEN))
    remotes = set(str(r) for i in issues for r in (i.upstream_url, i.topic_url))

    # TODO: locking.

    log = sys.stderr.write if os.getenv('JJP_DEBUG') else (lambda str: None)

    for url in remotes:
        if isinstance(url, unicode): raise ValueError(repr(url))
        fetch_remote(app, url)

    for issue in issues:
        new_upstream, new_topic, new_base = update_issue(app, issue)

        # case 1: no change
        if not new_upstream:
            log('Issue {}: No change\n'.format(issue.id))
            continue

        # case 2: submitted
        if not new_base:
            log('Issue {}: Submitted\n'.format(issue.id))
            db.update(Issues, dict(id=issue.id),
                upstream_latesthash=new_upstream,
                topic_latesthash=new_topic,
                status=Issues.STATUS_SUBMITTED)
            # TODO: system message.
            continue

        # case 3: new version
        db.update(Issues, dict(id=issue.id),
            upstream_latesthash=new_upstream, topic_latesthash=new_topic)
        count = db.execute(select([Versions])
            .where(Versions.c.issue_id == issue.id).count()).scalar()
        log('Issue {}: Creating version {}\n'.format(issue.id, count+1))
        db.insert(Versions, issue_id=issue.id, version_num=count+1,
                            base_hash=new_base, topic_hash=new_topic)
        # TODO: system message.


def cron(app):
    with app.db_engine.begin() as conn:
        db = DbHelper(conn)
        do_cron(app, db)

cron.help = '  $0 cron'

commands = {
    'cron': cron,
}
