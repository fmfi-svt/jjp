/** @jsx React.DOM */

(function () {


var t = JJP.t, fakelink = JJP.fakelink, Header = JJP.Header, AsyncDiffList = JJP.AsyncDiffList;


var IssueMetadata = JJP.IssueMetadata = React.createClass({
  render: function () {
    var issue = this.props.issueData.issue;
    var statuses = [t("Open"), t("Submitted"), t("Abandoned")];

    return <table className="metadata">
      <tr>
        <th><t>Upstream branch:</t></th>
        <td>{issue.upstream_branch}<t> at </t>{issue.upstream_url}</td>
      </tr>
      <tr>
        <th><t>Topic branch:</t></th>
        <td>{issue.topic_branch}<t> at </t>{issue.topic_url}</td>
      </tr>
      <tr>
        <th><t>Status:</t></th>
        <td className={"status" + issue.status}>{statuses[issue.status]}</td>
      </tr>
    </table>;
  }
});


var IssueCommitsRow = JJP.IssueCommitsRow = React.createClass({
  getInitialState: function () {
    return { open: false };
  },
  handleOpen: function () {
    this.setState({ open: !this.state.open });
  },

  handleChange: function (event) {
    if (event.target.checked && this.props.onChange) {
      this.props.onChange(event.target.name, event.target.value);
    }
  },

  componentDidUpdate: function () {
    var $details = jQuery(this.refs.details.getDOMNode());
    if (this.state.open) {
      $details.slideDown('fast');
    } else {
      $details.slideUp('fast');
    }
  },

  _radio: function (hash, name) {
    return <input type="radio" name={name} value={hash}
                  checked={this.props[name]} onChange={this.handleChange} />;
  },
  render: function () {
    var hash = this.props.hash;
    var shortHash = hash.substring(0, 7);
    var headers = this.props.commit.slice();
    var body = headers.pop();
    var firstLine = body.split("\n")[0];

    var labels = [];
    this.props.labels.forEach(function (label) {
      labels.push(" ", <span className="label" key={label}>{label}</span>);
    });

    return <tr>
      <td className="narrow">{this._radio(hash, "left")}</td>
      <td className="narrow">{this._radio(hash, "right")}</td>
      <td className="narrow"><abbr title={hash}>{shortHash}</abbr></td>
      <td>
        <pre>
          <fakelink onClick={this.handleOpen}>{firstLine}</fakelink>
          {labels}
        </pre>
        <pre className="details" ref="details">
          {headers.join("\n") + "\n\n" + body}
        </pre>
      </td>
    </tr>;
    // TODO: highlight parents on hover.
  }
});


var IssueCommits = JJP.IssueCommits = React.createClass({
  render: function () {
    var issueData = this.props.issueData;

    var rowLabels = {};
    var rowsOrder = [];

    issueData.versions.forEach(function (version) {
      addCommit(version.base_hash);
      addCommit(version.topic_hash);
    });
    function addCommit(hash) {
      var commit = issueData.commits[hash];
      if (!commit) return;

      if (rowLabels[hash]) return;
      rowLabels[hash] = [];

      commit.slice(0, commit.length - 1).forEach(function (header) {
        if (header.substring(0, 7) == 'parent ') {
          addCommit(header.substring(7));
        }
      });

      rowsOrder.push(hash);
    }

    issueData.versions.forEach(function (version) {
      rowLabels[version.base_hash].push("v" + version.version_num + " base");
      rowLabels[version.topic_hash].push("v" + version.version_num);
    });

    var rows = rowsOrder.map(function (hash) {
      return <IssueCommitsRow
          hash={hash} key={hash} commit={issueData.commits[hash]}
          left={hash == this.props.left} right={hash == this.props.right}
          labels={rowLabels[hash]} onChange={this.props.onChange} />;
    }, this);

    return <div className="commits"><table>
      <tr><th><t>L</t></th><th><t>R</t></th><th><t>Hash</t></th><th></th></tr>
      {rows}
    </table></div>;
  }
});


var IssuePage = JJP.IssuePage = React.createClass({
  handleCommitsChange: function (side, newValue) {
    var id = this.props.issueData.issue.id;
    var newPath = { left: this.props.left, right: this.props.right };
    newPath[side] = newValue;
    location.hash = '#' + id + '/' + newPath.left + '/' + newPath.right;
    // TODO: Because onhashchange isn't immediate, React first resets the
    // radio buttons to their previous values, and then goes to the new state
    // after onhashchange triggers. This seems wasteful.
  },

  render: function () {
    var issue = this.props.issueData.issue;

    var replyButton = this.props.username ?
      <div className="reply">
        <button onClick={this.handleReply}><t>Send Comments</t></button>
      </div> : null;

    return <div>
      <Header username={this.props.username}>
        <h2><a href={"#" + issue.id}>
          {"#" + issue.id + ": " + issue.title}
        </a></h2>
        {replyButton}
      </Header>

      <IssueMetadata issueData={this.props.issueData} />

      <IssueCommits issueData={this.props.issueData}
                    left={this.props.left} right={this.props.right}
                    onChange={this.handleCommitsChange} />

      <AsyncDiffList issueData={this.props.issueData}
                     left={this.props.left} right={this.props.right}
                     key={this.props.left + "." + this.props.right} />
    </div>;
    // TODO difflist
    // TODO globalthreads
  }
});


JJP.preprocessIssue = function (ci) {
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
}


var IssueLoadingPage = JJP.IssueLoadingPage = React.createClass({
  render: function () {
    return <div>
      <Header username={this.props.username} />
      <p><t>Loading...</t></p>
    </div>;
  }
});


var AsyncIssuePage = JJP.AsyncIssuePage = React.createClass({
  getInitialState: function () {
    return { issueData: null };
  },

  componentWillMount: function () {
    JJP.ajaxRequest(this.props.id + ".json", null, function (issueData) {
      JJP.preprocessIssue(issueData);
      this.setState({ issueData: issueData })
    }.bind(this));
  },

  render: function () {
    var issueData = this.state.issueData;

    if (issueData) {
      var lastVersion = issueData.versions[issueData.versions.length - 1];
      return <IssuePage username={this.props.username} issueData={issueData}
                        left={this.props.left || lastVersion.base_hash}
                        right={this.props.right || lastVersion.topic_hash} />;
    } else {
      return <IssueLoadingPage username={this.props.username} />;
    }
  },
});


})();
