
(function ($) {


JJP = {};


function t(str) {
  return str;
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


JJP.renderIssue = function (issueData, hashLeft, hashRight, diffData) {
  $("#jjp").empty().append(JJP.renderTop());
  $(".top").append($('<h2/>').append($('<a />')
    .attr('href', '#' + issueData.issue.id)
    .text('#' + issueData.issue.id + ': ' + issueData.issue.title)));
  $(".top").append($("<div/>").addClass("reply").append(
    $("<button />").text(t("Reply")).click(JJP.reply)));
  console.log(issueData, hashLeft, hashRight, diffData);
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

  if (JJP.loadedIssue && JJP.loadedIssue.id == issueId) {
    processData(JJP.loadedIssue);
  } else {
    JJP.renderLoading();
    $.get(issueId + ".json", processData);
    // TODO: process errors.
  }

  function processData(issueData) {
    if (wantPath != location.hash) return;   // hash changed in the meantime

    JJP.loadedIssue = issueData;

    var lastVersion = issueData.versions[issueData.versions.length - 1];
    if (!hashLeft) hashLeft = lastVersion.base_hash;
    if (!hashRight) hashRight = lastVersion.topic_hash;

    JJP.renderLoading();
    $.get(hashLeft + "." + hashRight + ".json", processDiff);
    // TODO: process errors.

    function processDiff(diffData) {
      if (wantPath != location.hash) return;   // hash changed in the meantime

      JJP.renderIssue(issueData, hashLeft, hashRight, diffData);
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
