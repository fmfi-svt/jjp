/** @jsx React.DOM */

(function () {


if (!window.JJP) JJP = {};


JJP.translate = function (str) {
  return str;
}

var t = JJP.t = function (props, child) {
  if (arguments.length == 1 && typeof props === 'string') {
    return JJP.translate(props);
  }

  if (props !== null) throw Error("<t> cannot have props");
  if (arguments.length != 2) throw Error("<t> requires a single child");
  if (typeof child !== 'string') throw Error("<t> requires string content");
  return JJP.translate(child);
}


JJP.ajaxRequest = function (url, data, success, error) {
  error = error || function (message) {
    // TODO: better error handling.
    alert(t("Error!") + "\n" + message);
  }
  jQuery.ajax({
    url: url,
    type: data ? 'POST' : 'GET',
    contentType: data ? 'application/json' : undefined,
    data: data ? JSON.stringify(data) : undefined,
    dataType: 'json',
    success: success,
    error: function (xhr, textStatus) {
      error(textStatus || t("Network error"));
    }
  });
}


var fakelink = JJP.fakelink = React.createClass({
  // This creates a fake link that won't open in a new tab when middle-clicked.
  // But we need to handle the keyboard too. Pressing Enter on <a> emits a click
  // event, and the HTML5 spec says elements with tabindex should do that too,
  // but they don't. <http://www.w3.org/TR/WCAG20-TECHS/SCR29> suggests using
  // a keyup event like this:
  handleKeyUp: function (event) {
    if (event.which == 13 && this.props.onClick) {
      this.props.onClick(event);
      return false;
    }
  },

  render: function () {
    return <span className="fakelink" tabIndex="0" role="button"
                 onClick={this.props.onClick} onKeyUp={this.handleKeyUp}>
      {this.props.children}
    </span>;
  }
});


var Header = JJP.Header = React.createClass({
  render: function () {
    var loginLink = "login?to=" + encodeURIComponent(location.href);
    var login = this.props.username ?
      <span className="login">
        {this.props.username + " \u2014 "}
        <a href="logout"><t>Log out</t></a>
      </span> :
      <span className="login"><a href={loginLink}><t>Log in</t></a></span>;
    return <div className="top">
      <h1><t>JJP</t></h1>
      {login}
      {this.props.children}
    </div>;
  }
});


var IndexPage = JJP.IndexPage = React.createClass({
  render: function () {
    return <div>
      <Header username={this.props.username} />
      <p><t>TODO</t></p>
    </div>;
    // TODO
  }
});


var NotFoundPage = JJP.NotFoundPage = React.createClass({
  render: function () {
    return <div>
      <Header username={this.props.username} />
      <p><t>URL not found</t></p>
    </div>;
  }
});


var App = JJP.App = React.createClass({
  getInitialState: function () {
    return { path: location.hash.substring(1) };
  },
  handleHashChange: function () {
    this.setState({ path: location.hash.substring(1) });
  },

  componentDidMount: function () {
    window.addEventListener('hashchange', this.handleHashChange, false);
  },
  componentWillUnmount: function () {
    window.removeEventListener('hashchange', this.handleHashChange, false);
  },

  route: function (path) {
    var AsyncIssuePage = JJP.AsyncIssuePage;
    if (path.match(/^\d+$/)) {
      return <AsyncIssuePage id={parseInt(path)} key={parseInt(path)} />;
    }
    if (path.match(/^\d+\/[0-9a-fA-F]{40}\/[0-9a-fA-F]{40}$/)) {
      var parts = path.toLowerCase().split("/");
      return <AsyncIssuePage id={parseInt(parts[0])} key={parseInt(parts[0])}
                             left={parts[1]} right={parts[2]} />;
    }
    if (path == '') {
      return <IndexPage />;
    }
    return <NotFoundPage />;
  },

  render: function () {
    return this.transferPropsTo(this.route(this.state.path));
  },
});


})();
