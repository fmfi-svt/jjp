/** @jsx React.DOM */

(function () {


var t = JJP.t, fakelink = JJP.fakelink;
var ThreadModel = JJP.ThreadModel, ThreadCollection = JJP.ThreadCollection;


var Thread = JJP.Thread = React.createClass({
  // TODO: fresh.

  handleReply: function () {
    this.props.thread.setDraftBody("");
    // TODO: focus.
  },
  handleDone: function () {
    this.props.thread.setDraftBody(t("Done."));
    this.props.thread.setDraftResolved(true);
  },
  handleAck: function () {
    this.props.thread.setDraftBody(t("Acknowledged."));
  },
  handleCancel: function () {
    this.props.thread.removeDraft();
  },

  handleBodyChange: function (event) {
    this.props.thread.setDraftBody(event.target.value);
  },
  handleResolvedChange: function () {
    this.props.thread.setDraftResolved(this.props.thread.resolved != event.target.checked);
  },

  render: function () {
    var issueData = this.props.issueData;
    var thread = this.props.thread;

    var commentNodes = [];
    thread.comments.forEach(function (comment) {
      var message = issueData.messagesById[comment.message_id];
      var time = (new Date(message.timestamp * 1000)).toLocaleString();
      commentNodes.push(<dt key={comment.message_id + "dt"}>{message.username} ({time})</dt>);
      commentNodes.push(<dd key={comment.message_id + "dd"}>{comment.body}</dd>);
    });

    var draftNode;
    if (thread.draft) {
      if (!this.cid) this.cid = "cid" + (''+Math.random()).replace(/\D/g, '');
      draftNode = <div>
        <div><textarea rows="5" value={thread.draftBody} onChange={this.handleBodyChange} /></div>
        <div>
          <input type="checkbox" id={this.cid} onChange={this.handleResolvedChange}
                 value={thread.resolved != thread.draftResolved} />
          <label htmlFor={this.cid}>{thread.resolved ?
              t(" Mark as unresolved (needs work)") :
              t(" Mark as resolved (done)")}</label>
        </div>
        <div><fakelink onClick={this.handleCancel}><t>Cancel</t></fakelink></div>
      </div>;
    } else {
      draftNode = <div>
        <fakelink onClick={this.handleReply}><t>Reply</t></fakelink>
        &nbsp;&nbsp;&nbsp;
        <fakelink onClick={this.handleDone}><t>Done</t></fakelink>
        &nbsp;&nbsp;&nbsp;
        <fakelink onClick={this.handleAck}><t>Ack</t></fakelink>
      </div>;
    }

    return <div className={"thread" + (thread.resolved ? " resolved" : "")}>
      {thread.comments.length ? <dl>{commentNodes}</dl> : null}
      {draftNode}
    </div>;
  }
});


var ThreadList = JJP.ThreadList = React.createClass({
  render: function () {
    // TODO: use a ThreadCollection view later.
    var issueData = this.props.issueData;
    var threadNodes = this.props.threads.map(function (thread) {
      return <Thread key={thread.localId} thread={thread} issueData={issueData} />
    });
    return <div>{threadNodes}</div>;
  },
});


})();
