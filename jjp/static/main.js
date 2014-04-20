
(function ($) {


JJP = {};


JJP.context = 3;   // TODO: configurable


function t(str) {
  return str;
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

  return $('<span class="fakelink" tabindex="0" role="button"></span>');
}


JJP.renderLoading = function () {
  $("#jjp").empty().append(JJP.renderTop(), $("<p/>").text(t("Loading...")));
}


JJP.renderTop = function () {
  var $top = $("<div/>").addClass("top");
  $top.append($("<h1/>").text(t("JJP")));
  if (window.JJP_username) {
    $top.append(
      $("<span/>").addClass("login").text(JJP.username + " \u2014 ").append(
        $("<a href='logout'></a>").text(t("Log out"))));
  } else {
    $top.append(
      $("<span/>").addClass("login").append(
        $("<a/>").attr("href", "login?to=" + encodeURIComponent(location.href))
          .text(t("Log in"))));
  }
  return $top;
}


JJP.reply = function () {
  // TODO: WIP.
}


JJP.renderIssue = function () {
  var issue = JJP.currentIssue.issue;
  $("#jjp").empty().append(JJP.renderTop());
  $(".top").append($('<h2/>').append($('<a />')
    .attr('href', '#' + issue.id)
    .text('#' + issue.id + ': ' + issue.title)));
  $(".top").append($("<div/>").addClass("reply").append(
    $("<button />").text(t("Reply")).click(JJP.reply)));

  var rows = {};
  var $commits = $("<table/>").appendTo($("<form/>").addClass("commits").appendTo("#jjp"));
  $commits.append($("<tr/>").append(
    $("<th/>").text(t("L")),
    $("<th/>").text(t("R")),
    $("<th/>").text(t("Hash")),
    $("<th/>")));
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

    rows[hash] = $("<tr/>").appendTo($commits).append(
      $("<td/>").addClass('narrow').append($("<input type='radio' />").attr({name: 'left', value: hash})),
      $("<td/>").addClass('narrow').append($("<input type='radio' />").attr({name: 'right', value: hash})),
      $("<td/>").addClass('narrow').append($("<abbr/>").text(hash.substring(0, 7)).attr('title', hash)),
      $("<td/>").append(
        $("<pre>").append(JJP.fakelink().text(body.split("\n")[0]).click(preClick)),
        $("<pre>").addClass("details").hide().text(headers.join("\n") + "\n\n" + body))
    );
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
      "<span> </span>", $("<span>").addClass("label").text(label));
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

  $('#jjp').append($('<div>').addClass('difflist')
    .append($('<div/>').addClass('loading').text(t("Loading..."))));

  var $globalthreads = $('<div>').addClass('globalthreads').appendTo('#jjp');
  $globalthreads.append($.map(
    JJP.currentIssue.threadsByLocation['global'] || [], JJP.renderThread));

  $('#jjp').append($('<p/>').append($('<button/>').text(t('New global thread')).click(function () {
    JJP.createGlobalThread();
  })));
}


JJP.renderThread = function (thread) {
  // TODO: WIP.
  var $thread = $('<div/>').addClass('thread').data('thread', thread);
  $thread.text(JSON.stringify(thread));
  return $thread;
}


JJP.makeDraftId = function () {
  for (var i = -1; JJP.currentIssue.drafts[i]; i--) {}
  return i;
}


JJP.createGlobalThread = function () {
  if (!window.JJP_username) {
    alert(t("Please log in to leave comments."));
    return;
  }
  var thread = { id: JJP.makeDraftId(), draft: "", resolved: false };
  $('.globalthreads').append(JJP.renderThread(thread));
}


JJP.createInlineThread = function ($tr, side) {
  if (!window.JJP_username) {
    alert(t("Please log in to leave comments."));
    return;
  }
  var me = $tr.data('me');
  var thread = {
    id: JJP.makeDraftId(),
    diff_from: JJP.currentLeft,
    diff_to: JJP.currentRight,
    diff_side: side,
    file: me[0],
    line: side ? me[2] : me[1],
    draft: "",
    resolved: false
  };
  $tr.find('td').eq(side).append(JJP.renderThread(thread));
}


JJP.renderCommentRow = function (filename, leftLine, rightLine) {
  var $tr = $('<tr/>').addClass('comments').data('me', [filename, leftLine, rightLine]);
  var lloc = filename + ":" + leftLine + ":0";
  var rloc = filename + ":" + rightLine + ":1";
  var lthreads = JJP.currentIssue.threadsByLocation[lloc];
  var rthreads = JJP.currentIssue.threadsByLocation[rloc];
  var $left = $.map(lthreads || [], JJP.renderThread);
  var $right = $.map(rthreads || [], JJP.renderThread);
  // TODO: Find out if this is faster: if ($left.length || $right.length) {
  $tr.append($('<td/>').attr('colspan', '2').append(lthreads),
             $('<td/>').attr('colspan', '2').append(lthreads));
  return $tr;
}


JJP.renderDiffContent = function (filename, diffdata) {
  var $table = $('<table/>');
  var ln = { 'old': 0, 'new': 0 };

  $table.on('dblclick', '.c', function (event) {
    JJP.createInlineThread($(this).closest('tr').next(), $(this).index() == 3 ? 1 : 0);
    event.preventDefault();
    return false;
  });

  function processLine($tr, tag, line) {
    if (line === undefined) {
      $tr.append($('<td/>').addClass('ln blank'), $('<td/>').addClass('c blank'));
      return;
    }
    ln[tag]++;
    var ir = $.isArray(line);
    $tr.append($('<td/>').addClass('ln ' + tag + (ir ? '' : ' ch')).text('\u00a0' + ln[tag] + '\u00a0'));
    var $td = $('<td/>').addClass('c ' + tag + (ir ? '' : ' ch')).appendTo($tr);
    if (ir) {
      for (var i = 0; i < line.length; i++) {
        $td.append(i % 2 ? document.createTextNode(line[i]) : $('<span/>').addClass('ch').text(line[i]));
      }
    } else {
      $td.text(line);
    }
  }
  function equalLine(row) {
    return $('<tr/>').addClass('code equal').append(
      $('<td/>').addClass('ln').text('\u00a0' + row[0] + '\u00a0'),
      $('<td/>').addClass('c').text(row[2]),
      $('<td/>').addClass('ln').text('\u00a0' + row[1] + '\u00a0'),
      $('<td/>').addClass('c').text(row[2])
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
          expander = $('<tr/>').appendTo($table).addClass('expander').
            data('hiddenRows', hidden).append(
              $('<td/>').attr('colspan', 4)
              .text(t('{num} matching lines \u2014 ').replace('{num}', hidden.length))
              .append(JJP.fakelink().text(t('Expand all')).click(expanderClick)));
        }
      }
    } else {
      for (var i = 0; i < oldLines.length || i < newLines.length; i++) {
        var $tr = $('<tr/>').addClass('code').appendTo($table);
        processLine($tr, 'old', oldLines[i]);
        processLine($tr, 'new', newLines[i]);
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
    $difflist.append($("<div/>").addClass('file').click(clickFile).append(
      $('<code/>').addClass("status " + status.substring(0, 1)).text(status.substring(0, 1)),
      srcfilename ? $("<code/>").addClass("name").text(srcfilename) : "",
      srcfilename ? $("<span/>").text(" \u2192 ") : "",
      $("<code/>").addClass("name").text(dstfilename),
      srcmode != dstmode && status != "A" && status != "D" ?
        $("<code/>").addClass("status").text(srcmode + " \u2192 " + dstmode) : ""
    ));
    $difflist.append($("<div/>").addClass('diff').hide().append(JJP.renderDiffContent(dstfilename, diffdata)));
  }

  function clickFile() {
    $(this).closest('.file').next().toggle();
  }
}


JJP.renderIndex = function () {
  function formSubmit() {
    var value = $("#issuenum").val();
    if (!value.match(/^\d+$/)) {
      alert(t("Not a number!"));
      return;
    }
    location.hash = '#' + value;
  }
  $("#jjp").empty().append(
    JJP.renderTop(),
    $("<form/>").submit(formSubmit).append(
      $("<p/>")
        .text(t("Open issue # "))
        .append($("<input type='text' size='5' id='issuenum' />"))
        .append("<span> </span>")
        .append($("<input type='submit' />").val(t("OK")))
    )
  );
}


JJP.makeIndexes = function () {
  var ci = JJP.currentIssue;

  ci.messagesById = {};
  for (var i = 0; i < ci.messages.length; i++) {
    var message = ci.message[i];
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
    if (id >= 0) {
      ci.threadsById[id].draft = drafts[id].draft;
      ci.threadsById[id].newResolved = drafts[id].newResolved;
    } else {
      allThreads.push(drafts[id]);
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
    $("<p/>").text(t("URL not found"))
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
