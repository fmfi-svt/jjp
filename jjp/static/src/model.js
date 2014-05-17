/** @jsx React.DOM */

(function () {


var t = JJP.t, fakelink = JJP.fakelink;


var ThreadModel = JJP.ThreadModel = function (base, collection) {
  this.localId = "local" + Math.random();
  for (var key in base) this[key] = base[key];

  this.collection = collection;
  this.collection.threads[this.localId] = this;
  if (this.id) {
    this.collection.savedThreads[this.id] = this;
  } else {
    this.comments = [];
    this.draft = true;
    this.draftBody = base.body;
    delete this.body;
    this.draftResolved = base.resolved;
    this.resolved = false;
  }
};

JJP.ThreadModel.prototype.setDraftBody = function (value) {
  this.draft = true;
  this.draftBody = value;
  if (!('draftResolved' in this)) this.draftResolved = this.resolved;
  this.collection.callback();
};

JJP.ThreadModel.prototype.setDraftResolved = function (value) {
  this.draft = true;
  if (!('draftBody' in this)) this.draftBody = '';
  this.draftResolved = value;
  this.collection.callback();
};

JJP.ThreadModel.prototype.removeDraft = function () {
  this.draft = false;
  delete this.draftBody;
  delete this.draftResolved;

  if (!this.id) {
    delete this.collection.threads[this.localId];
  }

  this.collection.callback();
};


var ThreadCollection = JJP.ThreadCollection = function (issueData, serializedDrafts) {
  var drafts = JSON.parse(serializedDrafts || "[]");

  this.savedThreads = {};
  this.threads = {};

  issueData.threads.forEach(function (thread) {
    new ThreadModel(thread, this);
    // TODO maybe indexes etc.
  }.bind(this));

  serializedDrafts.forEach(function (draft) {
    if (draft.id) {
      this.savedThreads[draft.id].draft = true;
      this.savedThreads[draft.id].draftBody = draft.body;
      this.savedThreads[draft.id].draftResolved = draft.resolved;
    } else if (draft.body) {
      new ThreadModel(draft, this);
    }
  }.bind(this));
};

ThreadCollection.prototype.serialize = function () {
  var result = [];

  for (var localId in this.threads) {
    var thread = this.threads[localId];
    if (thread.draftBody || thread.draftResolved != thread.resolved) {
      var saved = {};
      saved.body = thread.draftBody;
      saved.resolved = thread.draftResolved;
      if (thread.id) {
        saved.id = thread.id;
      } else {
        saved.diff_from = thread.diff_from;
        saved.diff_to = thread.diff_to;
        saved.diff_side = thread.diff_side;
        saved.file = thread.file;
        saved.line = thread.line;
        saved.side = thread.side;
      }
      result.append(saved);
    }
  }

  return JSON.stringify(result);
};

ThreadCollection.prototype.addGlobalThread = function () {
  var thread = new ThreadModel({ body: '', resolved: false }, this);
  this.callback();
  return thread;
};

ThreadCollection.prototype.addInlineThread = function (left, right, file, line, side) {
  var thread = new ThreadModel({ body: '', resolved: false }, this);
  this.callback();
  return thread;
};

ThreadCollection.prototype.getGlobalThreads = function () {
  var result = [];
};



/*
hmm, chceme toto api:

this.state.threadModel = new JJP.ThreadModel(
    this.props.issueData, JSON.parse(localStorage.get(bla) || "[]"));

oneThread.setDraftBody("")
oneThread.setDraftResolved(true)
oneThread.removeDraft()

oneThread.file
oneThread.line
oneThread.comments...
etc.
oneThread.draftBody
oneThread.draftResolved

threadModel.serialize()
threadModel.addGlobalThread()
threadModel.addInlineThread(left, right, file, line, side)

threadModel.getGlobalThreads()
threadModel.getInlineThreads(left, right, file, line, side)

threadModel.shouldFileUpdate()
threadModel.shouldThreadUpdate()

alebo mozno vseobecnejsie: vediet zaregistrovat "queries" na podmnoziny threadov
co ma zaujimaju - predstav si SQL indexy/viewy/nieco
a pre kazdy query vediet rychlo 1. zistit ci sa zmenil a 2. iterovat threadmi.
ake viewy budem mat:
- view globalnych threadov
- view threadov v subore F (tam len zistujem ci sa zmenil aby som nerenderoval)
- view threadov v subore F, riadku L, etc. (to realne iterujem a zobrazujem)
tak take cosi.
*/



JJP.ThreadModel = function (issueData, initialDrafts, callback) {
  this.threads = issueData.threads.slice();

  this.drafts = {};

  initialDrafts.forEach(function (draft) {
    if (!draft.id) {
      var thread = {};
      for (var key in draft) thread[key] = draft[key];
      delete thread.body;
      thread.resolved = false;
      thread.localId = "draft" + Math.random();
      this.threads.push(thread);
      draft = { id: thread.localId, body: draft.body, resolved: draft.resolved };
    }
    this.drafts[draft.id] = draft;
  }.bind(this));

  this.callback = callback;
};

JJP.ThreadModel.prototype.draftAdd = function () {
};

JJP.ThreadModel.prototype.draftSet = function () {
};


})();
