
import difflib
import re
import subprocess as SP
from werkzeug.exceptions import BadRequest
from werkzeug.routing import Rule
from werkzeug.wrappers import Response
from .utils import run_git, json_response
from . import intra_region_diff


def diff_plain(request, a, b):
    for hash in [a, b]:
        if not re.match(r'^[0-9a-fA-F]{40}$', hash):
            raise BadRequest()

    patch = run_git(request, 'git', 'diff', a, b)
    # TODO: process common errors

    return Response(patch)


def get_blob_content(checker, hash):
    if hash == '0' * 40:
        return ''
    checker.stdin.write(hash + '\n')
    result = checker.stdout.readline()
    if result.endswith('missing\n'):
        raise ValueError("hash {} does not exist".format(hash))
    _, type, size = result.split()
    return checker.stdout.read(int(size) + 1)[:-1]


def normalize_ir(lines, line_blocks):
    result = []

    for line, blocks in zip(lines, line_blocks):
        blocks = intra_region_diff.NormalizeBlocks(blocks, line)
        blocks = intra_region_diff.CompactBlocks(blocks)

        fragments = []
        last = 0
        for mystart, mylen in blocks:
            myend = mystart + mylen
            fragments.append(line[last:mystart])
            fragments.append(line[mystart:myend])
            last = myend

        while fragments and not fragments[-1]: fragments.pop()
        result.append(fragments)

    return result


def get_file_diff(old_content, new_content):
    # TODO: handle when both sides are equal
    # TODO: show status (added/removed/...) and show "Empty" near empty diff
    old_lines = old_content.splitlines(True)
    new_lines = new_content.splitlines(True)

    sm = difflib.SequenceMatcher(None, old_lines, new_lines)
    regions = [(tag, old_lines[i1:i2], new_lines[j1:j2])
               for tag, i1, i2, j1, j2 in sm.get_opcodes()]

    diff_params = intra_region_diff.GetDiffParams()

    result = []

    for tag, old, new in regions:
        if tag == 'replace' and intra_region_diff.CanDoIRDiff(old, new):
            old_chunks, new_chunks, ratio = intra_region_diff.IntraRegionDiff(
                old, new, diff_params)
            result.append([tag, normalize_ir(old, old_chunks),
                                normalize_ir(new, new_chunks)])
        elif tag == 'equal':
            result.append([tag, old])
        else:
            result.append([tag, old, new])

    return result


def diff_json(request, a, b):
    for hash in [a, b]:
        if not re.match(r'^[0-9a-fA-F]{40}$', hash):
            raise BadRequest()

    result = []

    rawdiff = run_git(request, 'git', 'diff-tree', '-r', a, b)

    git_dir = request.app.settings.git_dir
    checker = SP.Popen(['git', 'cat-file', '--batch'],
                       stdin=SP.PIPE, stdout=SP.PIPE, cwd=git_dir)

    for line in rawdiff.split('\n'):
        if not line: continue
        if line[0:1] != ':':
            raise ValueError("git diff-tree has unexpected output")
        status, _, filename = line[1:].partition('\t')
        srcmode, dstmode, srcblob, dstblob, status = status.split(' ')
        srccontent = get_blob_content(checker, srcblob)
        dstcontent = get_blob_content(checker, dstblob)
        # TODO: charset conversion
        # TODO: find both old and new filename for moves and renames
        diffdata = get_file_diff(srccontent, dstcontent)
        result.append([filename, srcmode, dstmode, status, diffdata])

    checker.stdin.close()
    checker.wait()
    if checker.returncode != 0:
        raise OSError("git cat-file --batch ended unexpectedly")

    return json_response(result)


def get_routes():
    yield Rule('/<string(length=40):a>.<string(length=40):b>.diff', methods=['GET'], endpoint=diff_plain)
    yield Rule('/<string(length=40):a>.<string(length=40):b>.json', methods=['GET'], endpoint=diff_json)
