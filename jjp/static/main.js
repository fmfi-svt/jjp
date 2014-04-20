
(function ($) {


JJP = {};


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

  $('#jjp').append($('<div>').addClass('difflist').append($('<div/>').addClass('loading').text(t("Loading..."))));

  // TODO: WIP.
}


JJP.renderDiff = function () {
  // TODO: WIP.
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
