
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
    $(document).on('keypress', '.fakelink', function (event) {
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


JJP.modal = function (child) {
  var $modal = el('div',
    el('div.modalback', { click: function () { $modal.hide(); } }),
    el('div.modalcontent', el('div.modalinner', child)));
  $modal.hide();
  return $modal;
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
  for (var localId in drafts) {
    var comment = $.extend({}, drafts[localId]);
    if (!comment.draftBody) continue;
    comment.body = comment.draftBody;
    comment.resolved = comment.draftResolved;
    delete comment.localId;
    delete comment.draftBody;
    delete comment.draftResolved;
    data.comments.push(comment);
  }

  if (!data.comments.length) {
    alert(t("You didn't write any comments."));
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

  var statuses = [t('Open'), t('Submitted'), t('Abandoned')];
  $jjp.append(el('table.metadata',
    el('tr', el('th', t('Upstream branch:')),
             el('td', issue.upstream_branch + t(' at ') + issue.upstream_url)),
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

  $commits.on('change', 'input:radio', function () {
    var left = $commits.find('input[name=left]:checked').val();
    var right = $commits.find('input[name=right]:checked').val();
    if (left != JJP.currentLeft || right != JJP.currentRight) {
      location.hash = '#' + issue.id + '/' + left + '/' + right;
    }
  });

  $jjp.append(el('div.difflist',
    el('div.loading', t("Loading..."))));

  var $allthreads;
  function settingsItem(name, value, label) {
    var checked = ((localStorage.getItem('jjp' + name) || '') == value);
    var cid = JJP.makeCid();
    return el('li',
      $('<input type="radio" />').attr({ name: name, value: value, id: cid }).prop('checked', checked),
      ' ', el('label', { 'for': cid }, label))
  }
  function settingsChange() {
    var loctype = $settings.find('input[name=loctype]:checked').val() || '';
    var restype = $settings.find('input[name=restype]:checked').val() || '';
    $allthreads.removeClass('noglobal noinline noresolved nounresolved');
    if (loctype) $allthreads.addClass(loctype);
    if (restype) $allthreads.addClass(restype);
    localStorage.setItem('jjploctype', loctype);
    localStorage.setItem('jjprestype', restype);
  }
  var $settings = el('div.settings',
    t('Filter threads:'),
    el('ul',
      settingsItem('loctype', '', t('All')),
      settingsItem('loctype', 'noglobal', t('Inline')),
      settingsItem('loctype', 'noinline', t('Global'))),
    el('ul',
      settingsItem('restype', '', t('All')),
      settingsItem('restype', 'noresolved', t('Unresolved')),
      settingsItem('restype', 'nounresolved', t('Resolved'))));
  $settings.on('change', 'input:radio', settingsChange);

  $jjp.append($allthreads = el('div.allthreads',
    $settings,
    $.map(JJP.currentIssue.allThreads || [], JJP.renderThread)));

  settingsChange();

  $jjp.append(el('p',
    el('button', { click: JJP.createGlobalThread }, t('New global thread'))));

  if (JJP.username) {
    function showReplyModal() {
      $replymodal.show();
      var mainThread = JJP.currentIssue.threads[0];
      if (!mainThread) return;
      if (!JJP.currentIssue.drafts[mainThread.localId]) {
        JJP.updateDraft(mainThread, '', mainThread.resolved);
      }
      $replymodal.find('.thread-' + mainThread.localId).find('textarea').focus();
    }
    var $replymodal;
    $jjp.append($replymodal = JJP.modal(el('div',
      el('div.replymodal',
        $.map(JJP.currentIssue.allThreads || [], JJP.renderThread)),
      el('div', el('button', { click: JJP.reply }, t("Send Reply"))))));
    $top.append(el('div.topbutton',
      el('button', { click: showReplyModal }, t("Reply"))));
    $replymodal.find('.thread').eq(0).addClass('firstthread');
  }

  var $timeline;
  $jjp.append($timeline = JJP.modal(el('div.timeline',
    $.map(JJP.currentIssue.messages || [], JJP.renderTimelineMessage))));
  $top.append(el('div.topbutton',
    el('button', { click: function () { $timeline.show(); } },
      t("Timeline"))));
}


JJP.updateDraft = function (thread, draftBody, draftResolved) {
  var drafts = JJP.currentIssue.drafts;
  if (!drafts[thread.localId]) {
    drafts[thread.localId] = { id: thread.id };
  }
  drafts[thread.localId].draftBody = draftBody;
  drafts[thread.localId].draftResolved = draftResolved;
  $('.thread-' + thread.localId).each(function () {
    var $thread = $(this);
    $thread.addClass('draft');
    var $textarea = $thread.find('textarea');
    var $checkbox = $thread.find(':checkbox');
    if ($textarea.val() != draftBody) $textarea.val(draftBody);
    $checkbox.prop('checked', draftResolved != thread.resolved);
  });
  localStorage.setItem("jjpdraft" + JJP.currentIssue.issue.id, JSON.stringify(drafts));
}


JJP.cancelDraft = function (thread) {
  var drafts = JJP.currentIssue.drafts;
  delete drafts[thread.localId];
  if (thread.id) {
    $('.thread-' + thread.localId).removeClass('draft');
  } else {
    $('.thread-' + thread.localId).remove();
  }
  localStorage.setItem("jjpdraft" + JJP.currentIssue.issue.id, JSON.stringify(drafts));
}


JJP.renderThread = function (thread) {
  var $thread = el('div.thread').addClass('thread-' + thread.localId).data('thread', thread);

  if (thread.file && thread.line && thread.diff_from && thread.diff_to) {
    $thread.append(el('div.where',
      JJP.fakelink().text(thread.file + ':' + thread.line).click(function () {
        JJP.scrollTo = thread.localId;
        if (JJP.currentLeft == thread.diff_from && JJP.currentRight == thread.diff_to && $('.difflist .file').length) {
          JJP.handleScrollTo();
        } else {
          location.hash = '#' + JJP.currentIssue.issue.id + '/' + thread.diff_from + '/' + thread.diff_to;
        }
      })));
  }

  if (thread.comments) {
    var $comments;
    $thread.append($comments = el('dl'));
    for (var i = 0; i < thread.comments.length; i++) {
      var comment = thread.comments[i];
      var message = JJP.currentIssue.messagesById[comment.message_id];
      var time = (new Date(message.timestamp * 1000)).toLocaleString();
      $comments.append(
        el('dt', { 'class': 'comment-' + message.id },
          el('strong.author', el('code', '\u25bc'), ' ', message.username, ' '), '(' + time + ')'),
        el('dd', { 'class': 'comment-' + message.id },
          el('strong.author', el('code', '\u25b6'), ' ', message.username, ' '), comment.body));
    }
    $comments.on('click', 'dt', function () {
      $(this).next('dd').andSelf().addClass('collapsed');
    });
    $comments.on('click', 'dd.collapsed', function () {
      $(this).prev('dt').andSelf().removeClass('collapsed');
    });
  }

  $thread.addClass(thread.resolved ? 'resolved' : 'unresolved');
  $thread.addClass(thread.diff_from || thread.diff_to ? 'inline' : 'global');

  var draft = JJP.currentIssue.drafts[thread.localId];
  var draftBody = draft ? draft.draftBody : '';
  var draftResolved = draft ? draft.draftResolved : thread.resolved;

  var $textarea, $checkbox;

  if (JJP.username) {
    $thread.append(el('div.actions',
      JJP.fakelink().text(t('Reply')).click(function () {
        JJP.updateDraft(thread, '', thread.resolved);
        $textarea.focus();
      }),
      '\u00a0\u00a0\u00a0',
      thread.resolved ?
        JJP.fakelink().text(t('Reopen')).click(function () {
          JJP.updateDraft(thread, '', false);
          $textarea.focus();
        }) :
        JJP.fakelink().text(t('Done')).click(function () {
          JJP.updateDraft(thread, 'Done.', true);
        }),
      '\u00a0\u00a0\u00a0',
      JJP.fakelink().text(t('Ack')).click(function () {
        JJP.updateDraft(thread, 'Acknowledged.', thread.resolved);
      })
    ));
  } else {
    $thread.append(el('div.actions',
      t('(Log in to leave comments.)')));
  }

  function autosave() {
    JJP.updateDraft(thread,
        $textarea.val(),
        $checkbox.is(':checked') ? !thread.resolved : thread.resolved);
  }

  var cid = JJP.makeCid();
  $thread.append(el('div.reply',
    el('div', $textarea = el('textarea', { rows: 5, val: draftBody }).on('input change', autosave)),
    el('div',
      $checkbox = $('<input type="checkbox"/>').attr('id', cid)
        .attr('checked', Boolean(draftResolved != thread.resolved))
        .on('click keypress change', autosave),
      el('label', { 'for': cid },
        thread.resolved ? t(' Mark as unresolved (needs work)') : t(' Mark as resolved (done)'))
    ),
    el('div',
      JJP.fakelink().text(t('Cancel')).click(function () {
        JJP.cancelDraft(thread);
      })
    )
  ));

  if (draft) $thread.addClass('draft');

  return $thread;
}


JJP.makeCid = function () {
  return 'cid' + (''+Math.random()).replace(/\D/g, '');
}


JJP.makeDraftId = function () {
  for (var i = 1; JJP.currentIssue.drafts['unsaved' + i]; i++) {}
  return 'unsaved' + i;
}


JJP.createGlobalThread = function () {
  if (!JJP.username) {
    alert(t("Please log in to leave comments."));
    return;
  }
  var thread = { localId: JJP.makeDraftId(), resolved: false };
  JJP.currentIssue.drafts[thread.localId] = thread;
  JJP.updateDraft(thread, '', false);
  JJP.renderThread(thread).appendTo('.replymodal');
  var $thread = JJP.renderThread(thread).appendTo('.allthreads');
  setTimeout(function () {
    window.scrollBy(0, 1000);
    $thread.find('textarea').focus();
  }, 1);
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
    localId: JJP.makeDraftId(),
    diff_from: JJP.currentLeft,
    diff_to: JJP.currentRight,
    diff_side: side,
    file: me[0],
    line: line,
    resolved: false
  };
  JJP.currentIssue.drafts[thread.localId] = thread;
  JJP.updateDraft(thread, '', false);
  var $thread = JJP.renderThread(thread).appendTo($tr.find('td').eq(side));
  setTimeout(function () { $thread.find('textarea').focus(); }, 1);
  JJP.renderThread(thread).appendTo('.replymodal');
  JJP.renderThread(thread).appendTo('.allthreads');
}


JJP.renderCommentRow = function (filename, leftLine, rightLine) {
  var $tr = el('tr.comments').data('me', [filename, leftLine, rightLine]);
  var lloc = filename + ":" + leftLine + ":0";
  var rloc = filename + ":" + rightLine + ":1";
  var lthreads = JJP.currentIssue.threadsByLocation[lloc];
  var rthreads = JJP.currentIssue.threadsByLocation[rloc];
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
      for (var i = 0; i < oldLines.length; i++) {
        if (JJP.currentIssue.threadsByLocation[filename + ':' + (ln['old'] + 1 + i) + ':0'] ||
            JJP.currentIssue.threadsByLocation[filename + ':' + (ln['new'] + 1 + i) + ':1']) {
          for (var j = i - JJP.context; j <= i + JJP.context; j++) isVisible[j] = true;
        }
      }

      var hidden = null;
      for (var i = 0; i < oldLines.length; i++) {
        ln['old']++;
        ln['new']++;
        if (isVisible[i]) {
          $table.append(equalLine([ln['old'], ln['new'], oldLines[i]]));
          hidden = null;
        } else {
          if (!hidden) hidden = [];
          hidden.push([ln['old'], ln['new'], oldLines[i]]);
          if (isVisible[i+1] || i+1 == oldLines.length) {
            if (hidden.length == 1) {
              $table.append(equalLine([ln['old'], ln['new'], oldLines[i]]));
            } else {
              $table.append(el('tr.expander', { data: { hiddenRows: hidden } },
                el('td', { colspan: 4 },
                  t('{num} matching lines \u2014 ').replace('{num}', hidden.length),
                  JJP.fakelink().text(t('Expand all')).click(expanderClick))));
            }
          }
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


JJP.handleScrollTo = function () {
  if (JJP.scrollTo) {
    var $difflist = $('.difflist');
    var $thread = $difflist.find('.thread-' + JJP.scrollTo);
    delete JJP.scrollTo;

    $thread.closest('.diff').show();
    $(window).scrollTop($thread.offset().top - $('.top').height() - 100);
    for (var i = 0; i < 6; i++) {
      setTimeout(function () { $thread.toggleClass('highlight'); }, i*200 + 100);
    }
  }
}


JJP.renderTimelineMessage = function (message) {
  var time = (new Date(message.timestamp * 1000)).toLocaleString();
  return el('div.message',
    el('h3', message.username + ' (' + time + ')'),
    $.map(message.comments, renderComment));

  function renderComment(comment) {
    var thread = JJP.currentIssue.threadsById[comment.thread_id];
    var $thread = JJP.renderThread(thread);
    $thread.find('dt, dd').addClass('collapsed');
    $thread.find('.comment-' + message.id).removeClass('collapsed');
    return $thread;
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
    el('p',
      el('strong', t('Recommended:')),
      t(' Use the '),
      el('a', { href: 'static/jjp', download: 'jjp' }, t('JJP command line utility')),
      t('.')));
  $('#jjp').append(
    el('h3', t('Create new issue \u2013 manual method')),
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
    thread.localId = '' + thread.id;
    thread.comments = [];
    ci.threadsById[thread.id] = thread;
  }

  for (var i = 0; i < ci.comments.length; i++) {
    var comment = ci.comments[i];
    ci.messagesById[comment.message_id].comments.push(comment);
    ci.threadsById[comment.thread_id].comments.push(comment);
  }

  ci.allThreads = ci.threads.slice();
  ci.drafts = JSON.parse(localStorage.getItem("jjpdraft" + ci.issue.id) || "{}");
  for (var localId in ci.drafts) {
    if (!ci.drafts[localId].id) {
      ci.allThreads.push(ci.drafts[localId]);
    }
  }

  ci.threadsByLocation = {};
  for (var i = 0; i < ci.allThreads.length; i++) {
    var thread = ci.allThreads[i], location = null;
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
      JJP.handleScrollTo();
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
