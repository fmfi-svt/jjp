
(function ($) {


if (!window.JJP) JJP = {};


JJP.context = 3;   // TODO: configurable


function t(str) {
  return str;
}


function el(tagName, opt_attrs, opt_children) {
  var classes = tagName.split('.');
  tagName = classes.shift();

  var children = Array.prototype.slice.call(arguments, 1);
  var attrs = $.isPlainObject(children[0]) ? children.shift() : undefined;
  var $element = $('<' + tagName + '/>', attrs);
  for (var i = 0; i < classes.length; i++) {
    $element.addClass(classes[i]);
  }
  for (var i = 0; i < children.length; i++) {
    if (!children[i]) continue;
    if (jQuery.type(children[i]) === 'string') {
      $element.append(document.createTextNode(children[i]));
    } else {
      $element.append(children[i]);
    }
  }
  return $element;
}


var _fakelink_initialized = false;
JJP.fakelink = function () {
  // This creates a fake link that won't open in a new tab when middle-clicked.
  // But we need to handle the keyboard too. Pressing Enter on <a> emits a click
  // event, and the HTML5 spec says elements with tabindex should do that too,
  // but they don't. <http://www.w3.org/TR/WCAG20-TECHS/SCR29> suggests this:
  if (!_fakelink_initialized) {
    $(document).on('keyup', '.fakelink', function (event) {
      if (event.which == 13) {
        $(this).click();
        return false;
      }
      return true;
    });
    _fakelink_initialized = true;
  }

  return el('span.fakelink', { tabindex: 0, role: 'button' });
}


JJP.renderLoading = function () {
  $("#jjp").empty().append(JJP.renderTop(), el('p', t("Loading...")));
}


JJP.renderTop = function () {
  return el('div.top',
    el('h1', t("JJP")),
    JJP.username ?
      el('span.login',
        JJP.username + " \u2014 ",
        el('a', { href: 'logout' }, t("Log out"))) :
      el('span.login',
        el('a', { href: 'login?to=' + encodeURIComponent(location.href) }, t("Log in"))));
}


JJP.reply = function () {
  var issueId = JJP.currentIssue.issue.id;

  var data = { issue_id: issueId, comments: [] };

  var drafts = JJP.currentIssue.drafts;
  for (var id in drafts) {
    var comment = $.extend({}, drafts[id]);
    if (id < 0) delete comment['id'];
    data.comments.push(comment);
  }

  if (!data.comments.length) {
    alert(t("Press the button after you write your comments."));
    return;
  }

  $.ajax({
    type: 'POST',
    url: 'post/message',
    data: JSON.stringify(data),
    contentType: 'application/json',
    dataType: 'json',
    success: function () {
      localStorage.removeItem('jjpdraft' + issueId);
      location.reload();
    },
    error: function () {
      alert(t("Error!"));
      // TODO: process errors better.
    }
  });
}


JJP.renderIssue = function () {
  var issue = JJP.currentIssue.issue;

  var $jjp = $('#jjp');
  var $top;
  $jjp.empty().append($top = JJP.renderTop());
  $top.append(el('h2',
    el('a', { href: '#' + issue.id }, '#' + issue.id + ': ' + issue.title)));
  if (JJP.username) {
    $top.append(el('div.reply',
      el('button', { click: JJP.reply }, t("Send Comments"))));
  }

  var statuses = [t('Open'), t('Submitted'), t('Abandoned')];
  $jjp.append(el('table.metadata',
    el('tr', el('th', t('Upstream branch:')),
             el('td', issue.upstream_branch + t(' at' ) + issue.upstream_url)),
    el('tr', el('th', t('Topic branch:')),
             el('td', issue.topic_branch + t(' at '), issue.topic_url)),
    el('tr', el('th', t('Status:')),
             el('td', { 'class': 'status' + issue.status }, statuses[issue.status]))));

  var rows = {};
  var $commits;
  $jjp.append(el('form.commits',
    $commits = el('table',
      el('tr',
        el('th', t('L')),
        el('th', t('R')),
        el('th', t('Hash')),
        el('th')))));
  for (var i = 0; i < JJP.currentIssue.versions.length; i++) {
    var version = JJP.currentIssue.versions[i];
    addCommit(version.base_hash);
    addCommit(version.topic_hash);
  }
  function addCommit(hash) {
    var commit = JJP.currentIssue.commits[hash];
    if (!commit) return;
    var headers = commit.slice(0, commit.length - 1);
    var body = commit[commit.length - 1];

    if (rows[hash]) return;
    rows[hash] = true;

    for (var i = 0; i < headers.length; i++) {
      var line = commit[i];
      if (line.substring(0, 7) == 'parent ') {
        addCommit(line.substring(7));
      }
    }

    $commits.append(rows[hash] = el('tr',
      el('td.narrow', $("<input type='radio' />").attr({ name: 'left', value: hash })),
      el('td.narrow', $("<input type='radio' />").attr({ name: 'right', value: hash })),
      el('td.narrow', el('abbr', { title: hash }, hash.substring(0, 7))),
      el('td',
        el('pre', JJP.fakelink().click(preClick).text(body.split("\n")[0])),
        el('pre.details', headers.join('\n') + '\n\n' + body).hide())));
    // TODO: highlight parents on hover.
  }
  function preClick() {
    $(this).closest("pre").next().slideToggle("fast");
  }

  for (var i = 0; i < JJP.currentIssue.versions.length; i++) {
    var version = JJP.currentIssue.versions[i];
    addLabel(rows[version.base_hash], "v" + version.version_num + " base");
    addLabel(rows[version.topic_hash], "v" + version.version_num);
  }
  function addLabel($row, label) {
    $row.find('pre').eq(0).append(
      el('span', ' '), el('span.label', label));
  }

  rows[JJP.currentLeft].find('[name=left]').prop('checked', true);
  rows[JJP.currentRight].find('[name=right]').prop('checked', true);
  console.log(rows[JJP.currentLeft]);

  $commits.on('change', 'input:radio', function () {
    var left = $commits.find('input[name=left]:checked').val();
    var right = $commits.find('input[name=right]:checked').val();
    if (left != JJP.currentLeft || right != JJP.currentRight) {
      location.hash = '#' + issue.id + '/' + left + '/' + right;
    }
  });

  $jjp.append(el('div.difflist',
    el('div.loading', t("Loading..."))));

  $jjp.append(el('div.globalthreads',
    $.map(JJP.currentIssue.threadsByLocation['global'] || [], JJP.renderThread)));

  $jjp.append(el('p',
    el('button', { click: JJP.createGlobalThread }, t('New global thread'))));
}


JJP.renderThread = function (thread) {
  var fresh = thread.fresh;
  delete thread.fresh;

  var $thread = el('div.thread').data('thread', thread);

  if (thread.comments) {
    var $comments;
    $thread.append($comments = el('dl'));
    for (var i = 0; i < thread.comments.length; i++) {
      var comment = thread.comments[i];
      var message = JJP.currentIssue.messagesById[comment.message_id];
      var time = (new Date(message.timestamp * 1000)).toLocaleString()
      $comments.append(
        el('dt', message.username + ' (' + time + ')'),
        el('dd', comment.body));
    }
  }

  var originalResolved = thread.id >= 0 ? thread.resolved : false;
  var drafts = JJP.currentIssue.drafts;
  var draft = drafts[thread.id] || (thread.id >= 0 ? { id: thread.id, resolved: originalResolved, body: '' } : thread);

  if (originalResolved) $thread.addClass('resolved');

  var $textarea, $checkbox;

  function autosave() {
    var content = $textarea.val();
    var toggleResolved = $checkbox.is(':checked');
    if (content || toggleResolved) {
      if (!drafts[thread.id]) drafts[thread.id] = draft;
      draft.body = content;
      draft.resolved = (toggleResolved ? !originalResolved : originalResolved);
    } else {
      delete drafts[thread.id];
    }
    localStorage.setItem("jjpdraft" + JJP.currentIssue.issue.id, JSON.stringify(drafts));
  }

  $thread.append(el('div.actions',
    JJP.fakelink().text(t('Reply')).click(function () {
      $thread.find('.actions').hide();
      $thread.find('.reply').show();
      $textarea.focus();
      autosave();
    }),
    '\u00a0\u00a0\u00a0',
    JJP.fakelink().text(t('Done')).click(function () {
      $thread.find('.actions').hide();
      $thread.find('.reply').show();
      $textarea.val(t('Done.'));
      $checkbox[0].checked = !originalResolved;
      autosave();
    }),
    '\u00a0\u00a0\u00a0',
    JJP.fakelink().text(t('Ack')).click(function () {
      $thread.find('.actions').hide();
      $thread.find('.reply').show();
      $textarea.val(t('Acknowledged.'));
      autosave();
    })
  ));

  var cid = 'cid' + (''+Math.random()).replace(/\D/g, '');
  $thread.append(el('div.reply',
    el('div', $textarea = el('textarea', { rows: 5, val: draft.body }).on('input change', autosave)),
    el('div',
      $checkbox = $('<input type="checkbox"/>').attr('id', cid)
        .attr('checked', Boolean(draft.resolved != originalResolved))
        .on('click keypress change', autosave),
      el('label', { 'for': cid },
        !originalResolved ? t(' Mark as resolved (done)') : t(' Mark as unresolved (needs work)'))
    ),
    el('div',
      JJP.fakelink().text(t('Cancel')).click(function () {
        $thread.find('.actions').show();
        $thread.find('.reply').hide();
        $textarea.val('');
        $checkbox[0].checked = false;
        autosave();
        if (thread.id < 0) $thread.remove();
      })
    )
  ));
  $thread.find('.reply').hide();

  if (fresh || draft.body || draft.resolved != originalResolved) {
    $thread.find('.actions').hide();
    $thread.find('.reply').show();
  }
  if (fresh) {
    setTimeout(function () { $textarea.focus(); }, 1);
  }

  return $thread;
}


JJP.makeDraftId = function () {
  for (var i = -1; JJP.currentIssue.drafts[i]; i--) {}
  return i;
}


JJP.createGlobalThread = function () {
  if (!JJP.username) {
    alert(t("Please log in to leave comments."));
    return;
  }
  var thread = { id: JJP.makeDraftId(), body: "", resolved: false, fresh: true };
  $('.globalthreads').append(JJP.renderThread(thread));
}


JJP.createInlineThread = function ($tr, side) {
  if (!JJP.username) {
    alert(t("Please log in to leave comments."));
    return;
  }
  var me = $tr.data('me');
  var line = side ? me[2] : me[1];
  if (!line) return;
  var thread = {
    id: JJP.makeDraftId(),
    diff_from: JJP.currentLeft,
    diff_to: JJP.currentRight,
    diff_side: side,
    file: me[0],
    line: line,
    body: "",
    resolved: false,
    fresh: true
  };
  $tr.find('td').eq(side).append(JJP.renderThread(thread));
}


JJP.renderCommentRow = function (filename, leftLine, rightLine) {
  var $tr = el('tr.comments').data('me', [filename, leftLine, rightLine]);
  var lloc = filename + ":" + leftLine + ":0";
  var rloc = filename + ":" + rightLine + ":1";
  var lthreads = JJP.currentIssue.threadsByLocation[lloc];
  var rthreads = JJP.currentIssue.threadsByLocation[rloc];
  if (lthreads || rthreads) console.log(filename, leftLine, rightLine);
  var $left = $.map(lthreads || [], JJP.renderThread);
  var $right = $.map(rthreads || [], JJP.renderThread);
  // TODO: Find out if this is faster: if ($left.length || $right.length) {
  $tr.append(el('td.comments', { 'colspan': '2' }, $left),
             el('td.comments', { 'colspan': '2' }, $right));
  return $tr;
}


JJP.renderDiffContent = function (filename, diffdata) {
  var $table = el('table.difftable');
  var ln = { 'old': 0, 'new': 0 };

  $table.on('dblclick', '.c', function (event) {
    JJP.createInlineThread($(this).closest('tr').next(), $(this).index() == 3 ? 1 : 0);
    event.preventDefault();
    return false;
  });

  function processLine(tag, line) {
    if (line === undefined) {
      return el('td.ln.blank').add(el('td.c.blank'));
    }
    ln[tag]++;
    var ir = $.isArray(line);
    return (
      el('td', { 'class': 'ln ' + tag + (ir ? '' : ' ch') }, '\u00a0' + ln[tag] + '\u00a0').add(
      el('td', { 'class': 'c ' + tag + (ir ? '' : ' ch') },
        ir ? $.map(line, function (word, i) { return el(i % 2 ? 'span' : 'span.ch', word); }) : line)));
  }
  function equalLine(row) {
    return el('tr.code.equal',
      el('td.ln', '\u00a0' + row[0] + '\u00a0'),
      el('td.c', row[2]),
      el('td.ln', '\u00a0' + row[1] + '\u00a0'),
      el('td.c', row[2])
    ).add(JJP.renderCommentRow(filename, row[0], row[1]));
  }
  function expanderClick() {
    var $expander = $(this).closest('.expander');
    var rows = $expander.data('hiddenRows');
    $expander.after($.map(rows, equalLine));
    $expander.remove();
  }

  for (var ci = 0; ci < diffdata.length; ci++) {
    var chunk = diffdata[ci];
    var tag = chunk[0], oldLines = chunk[1], newLines = chunk[2];
    if (tag == 'equal') {
      var isVisible = [];
      if (ci != 0) {
        for (var i = 0; i < JJP.context; i++) isVisible[i] = true;
      }
      if (ci != diffdata.length - 1) {
        for (var i = 0; i < JJP.context; i++) isVisible[oldLines.length - 1 - i] = true;
      }
      var hidden = [];
      for (var i = 0; i < oldLines.length; i++) if (!isVisible[i]) {
        hidden.push([ln['old']+1+i, ln['new']+1+i, oldLines[i]]);
      }
      if (hidden.length == 1) {
        hidden = [];
        for (var i = 0; i < oldLines.length; i++) isVisible[i] = true;
      }

      var expander = null;
      for (var i = 0; i < oldLines.length; i++) {
        ln['old']++;
        ln['new']++;
        if (isVisible[i]) {
          $table.append(equalLine([ln['old'], ln['new'], oldLines[i]]));
        } else if (!expander) {
          $table.append(expander = el('tr.expander', { data: { hiddenRows: hidden } },
            el('td', { colspan: 4 },
              t('{num} matching lines \u2014 ').replace('{num}', hidden.length),
              JJP.fakelink().text(t('Expand all')).click(expanderClick))));
        }
      }
    } else {
      for (var i = 0; i < oldLines.length || i < newLines.length; i++) {
        var $tr;
        $table.append(el('tr.code',
          processLine('old', oldLines[i]),
          processLine('new', newLines[i])));
        $table.append(JJP.renderCommentRow(filename,
          oldLines[i] ? ln['old'] : null, newLines[i] ? ln['new'] : null));
      }
    }
  }
  return $table;
}


JJP.renderDiff = function () {
  var $difflist = $('.difflist');
  $difflist.empty();
  for (var i = 0; i < JJP.currentDiff.length; i++) {
    var row = JJP.currentDiff[i];
    var srcfilename = row[0], dstfilename = row[1], srcmode = row[2], dstmode = row[3], status = row[4], diffdata = row[5];
    var text = (srcfilename ? srcfilename + " \u2192 " : "") + dstfilename;
    $difflist.append(el('div.file', { click: clickFile },
      el('code', { 'class': "status " + status.substring(0, 1) }, status.substring(0, 1)),
      srcfilename ? el('code.name', srcfilename) : null,
      srcfilename ? " \u2192 " : null,
      el('code.name', dstfilename),
      srcmode != dstmode && status != "A" && status != "D" ?
        el('code.status', srcmode + " \u2192 " + dstmode) : null
    ));
    $difflist.append(el('div.diff', JJP.renderDiffContent(dstfilename, diffdata)).hide());
  }

  function clickFile() {
    $(this).closest('.file').next().toggle();
  }
}


JJP.renderIndex = function () {
  function formSubmit() {
    var value = $(".issuenum").val();
    if (!value.match(/^\d+$/)) {
      alert(t("Not a number!"));
      return false;
    }
    location.hash = '#' + value;
    return false;
  }
  $("#jjp").empty().append(
    JJP.renderTop(),
    el('h3', t('Open issue')),
    el('form', { submit: formSubmit }, el('p',
      t('Open issue # '),
      $("<input type='text' size='5' class='issuenum' />"),
      ' ',
      $("<input type='submit' />").val(t("OK")))));

  function row(label, fieldName) {
    return el('tr',
      el('th', label),
      el('td', $("<input type='text'/>").attr("name", fieldName)));
  }
  function createIssue() {
    var $form = $(this);
    var ok = true;
    var data = {};
    $form.find('input:text').each(function () {
      if (!this.value) ok = false;
      data[this.name] = this.value;
    });
    if (!ok) {
      alert(t("All fields are required!"))
      return false;
    }
    $.ajax({
      type: 'POST',
      url: 'post/issue',
      data: JSON.stringify(data),
      contentType: 'application/json',
      dataType: 'json',
      success: function (result) {
        location.hash = '#' + result.saved;
      },
      error: function () {
        alert(t("Error!"));
        // TODO: process errors better.
      }
    });
    return false;
  }
  $('#jjp').append(
    el('h3', t('Create new issue')),
    !JJP.username ? el('p', t('Log in to create a new issue.')) :
    el('form', { submit: createIssue },
      el('table.metadata',
        row(t("Title:"), "title"),
        row(t("Upstream URL:"), "upstream_url"),
        row(t("Upstream branch:"), "upstream_branch"),
        row(t("Topic URL:"), "topic_url"),
        row(t("Topic branch:"), "topic_branch"),
        el('tr', el('th'), el('td',
          $("<input type='submit'>").val(t("Create")))))
    )
  );
}


JJP.makeIndexes = function () {
  var ci = JJP.currentIssue;

  ci.messagesById = {};
  for (var i = 0; i < ci.messages.length; i++) {
    var message = ci.messages[i];
    message.comments = [];
    ci.messagesById[message.id] = message;
  }

  ci.threadsById = {};
  for (var i = 0; i < ci.threads.length; i++) {
    var thread = ci.threads[i];
    thread.comments = [];
    ci.threadsById[thread.id] = thread;
  }

  for (var i = 0; i < ci.comments.length; i++) {
    var comment = ci.comments[i];
    ci.messagesById[comment.message_id].comments.push(comment);
    ci.threadsById[comment.thread_id].comments.push(comment);
  }

  var allThreads = ci.threads.slice();
  ci.drafts = JSON.parse(localStorage.getItem("jjpdraft" + ci.issue.id) || "{}");
  for (var id in ci.drafts) {
    if (id < 0) {
      allThreads.push(ci.drafts[id]);
    }
  }

  ci.threadsByLocation = {};
  for (var i = 0; i < allThreads.length; i++) {
    var thread = allThreads[i], location = null;
    if (thread.diff_from || thread.diff_to) {
      if (thread.diff_from != JJP.currentLeft || thread.diff_to != JJP.currentRight) continue;
      location = thread.file + ":" + thread.line + ":" + thread.diff_side;
    } else {
      location = 'global';
    }
    if (!ci.threadsByLocation[location]) {
      ci.threadsByLocation[location] = [];
    }
    ci.threadsByLocation[location].push(thread);
  }
}


JJP.goIssue = function (issueId, hashLeft, hashRight) {
  var wantPath = location.hash;

  if (JJP.currentIssue && JJP.currentIssue.issue.id == issueId) {
    processData(JJP.currentIssue);
  } else {
    JJP.renderLoading();
    $.get(issueId + ".json", processData);
    // TODO: process errors.
  }

  function processData(issueData) {
    if (wantPath != location.hash) return;   // hash changed in the meantime

    JJP.currentIssue = issueData;

    var lastVersion = issueData.versions[issueData.versions.length - 1];
    if (!hashLeft) hashLeft = lastVersion.base_hash;
    if (!hashRight) hashRight = lastVersion.topic_hash;

    JJP.currentLeft = hashLeft;
    JJP.currentRight = hashRight;

    JJP.makeIndexes();

    // TODO: Only render issue if changed. (Change checked radios if needed.)
    JJP.renderIssue();

    $.get(hashLeft + "." + hashRight + ".json", processDiff);
    // TODO: process errors.

    function processDiff(diffData) {
      if (wantPath != location.hash) return;   // hash changed in the meantime

      JJP.currentDiff = diffData;
      JJP.renderDiff();
    }
  }
}


JJP.goIndex = function () {
  JJP.renderIndex();
}


JJP.go404 = function () {
  $("#jjp").empty().append(
    JJP.renderTop(),
    el('p', t("URL not found"))
  );
}


JJP.go = function () {
  var path = location.hash.substring(1);
  if (path.match(/^\d+$/)) {
    return JJP.goIssue(parseInt(path));
  }
  if (path.match(/^\d+\/[0-9a-fA-F]{40}\/[0-9a-fA-F]{40}$/)) {
    var parts = path.split("/");
    return JJP.goIssue(
        parseInt(parts[0]), parts[1].toLowerCase(), parts[2].toLowerCase());
  }
  if (path.match(/^$/)) {
    return JJP.goIndex();
  }
  return JJP.go404();
}


window.onhashchange = function () {
  JJP.go();
}

JJP.go();

})(jQuery);
