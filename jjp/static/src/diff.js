/** @jsx React.DOM */

(function () {


var t = JJP.t;


var DiffFile = JJP.DiffFile = React.createClass({
  getInitialState: function () {
  },

  renderEqualChunk: function (rows, lines) {
    aaaa
  },

  renderChangedChunk: function (rows, tag, oldLines, newLines) {
  },

  render: function () {
    var rows = [];
    var ln = { 'old': 0, 'new': 0 };

    // TODO dblclick '.c' createInlineThread

    function processLine($tr, tag, line) {
    }
    function equalLine(row) {
    }

    this.props.chunks.forEach(function (chunk, ci) {
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
    }.bind(this));

    return <table className="difftable">{rows}</table>;
  }
  /*
JJP.renderDiffContent = function (filename, diffdata) {
  var $table = $('<table/>').addClass('difftable');
  var ln = { 'old': 0, 'new': 0 };

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
  */
});


var DiffList = JJP.DiffList = React.createClass({
  getInitialState: function () {
    return {};
  },

  handleExpand: function (key) {
    var update = {};
    update[key] = !this.state[key];
    this.setState(update);
  },

  render: function () {
    var difflistNodes = {};

    this.props.diffData.forEach(function (row, i) {
      var srcfilename = row[0], dstfilename = row[1], srcmode = row[2], dstmode = row[3], status = row[4], chunks = row[5];
      var text = (srcfilename ? srcfilename + " \u2192 " : "") + dstfilename;

      difflistNodes["file" + i] = <div className="file" onClick={this.handleExpand.bind(this, 'show' + i)}>
        <code className={"status " + status.substring(0, 1)}>{status.substring(0, 1)}</code>
        {srcfilename ? <code className="name">{srcfilename}</code> : null}
        {srcfilename ? " \u2192 " : null}
        <code className="name">{dstfilename}</code>
        {srcmode != dstmode && status != "A" && status != "D" ?
          <code className="status">{srcmode + " \u2192 " + dstmode}</code> : null}
      </div>;

      if (this.state['show' + i]) {
        difflistNodes["diff" + i] = <div className="diff">
          <DiffFile filename={dstfilename} chunks={chunks} />
        </div>;
        // TODO more props for DiffFile
      }
    }.bind(this));

    return <div className="difflist">{difflistNodes}</div>;
  }
});


var AsyncDiffList = JJP.AsyncDiffList = React.createClass({
  getInitialState: function () {
    return { diffData: null };
  },

  componentWillMount: function () {
    JJP.ajaxRequest(this.props.left + "." + this.props.right + ".json", null, function (diffData) {
      // TODO: check if still mounted
      this.setState({ diffData: diffData });
    }.bind(this));
  },

  render: function () {
    if (this.state.diffData) {
      // TODO: more props?
      return <DiffList left={this.props.left} right={this.props.right}
                       diffData={this.state.diffData} issueData={this.props.issueData} />;
    } else {
      return <div className="difflist"><div className="loading"><t>Loading...</t></div></div>;
    }
  }
});


})();
