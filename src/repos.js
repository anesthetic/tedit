/*global define, chrome*/
define("repos", function () {
  var prefs = require('prefs');
  var fileSystem = chrome.fileSystem;
  var importEntry = require('importfs');

  var urls = prefs.get("urls", []);
  var repos = {};
  urls.forEach(function (url) {
    var repo = repos[url] = {};
    var match = url.match(/^github:\/\/([^\/]+\/[^\/]+$)/);
    if (match) {
      require('js-github')(repo, match[1], prefs.get("githubToken"));
    }
    else {
      require('indexeddb')(repo, url);
    }
    require('pathtoentry')(repo);
    repo.remoteUrl = url;
  });
  console.log(repos);

  // github://1fed34ade@creationix/conquest
  // git://github.com/creationix/conquest.git
  // https://1fed34ade@github.com/creationix/conquest.git
  // local://foo

  // repo.githubRoot
  // repo.githubToken
  // remote
  //   type: github
  //   path: creationix/conquest
  //   token: 1fed3341234fdad1098dfecb7c87

  //   type: git | http(s)
  //   host: github.com | bitbucket.org | etc..
  //   port: 443 | 80 | 9418 | etc..
  //   path: /creationix/conquest.git
  var repos;

  return {
    getRepos: getRepos,
    saveRoots: saveRoots,
    newFromFolder: newFromFolder,
    newEmpty: newEmpty,
    // clone: clone,
  };

  // Callback a list of all the saved repos.
  // Used at startup
  function getRepos(callback) {
    if (repos) return callback(null, repos);
    var roots = prefs.get("roots", {});
    repos = {};
    var left = 0;
    Object.keys(roots).forEach(function (name) {
      left++;
      newRepo(name, function (err) {
        if (err) throw err;
        repos[name].root = roots[name];
        if (--left) return;
        callback(null, repos);
      });
    });
    if (!left) return callback(null, repos);
  }

  function saveRoots() {
    var roots = {};
    Object.keys(repos).forEach(function (name) {
      roots[name] = repos[name].root;
    });
    prefs.set("roots", roots);
  }

  function newRepo(name, callback) {
    if (name in repos) return callback(new Error("Name already taken: " + name));
    var repo = repos[name] = {name: name};
    require('indexeddb')(repo, function (err) {
      if (err) return callback(err);
      require('pathtoentry')(repo);
      callback(null, repo);
    });
  }

  // Callback contains (err, repo, name, rootHash)
  function newFromFolder(callback) {
    fileSystem.chooseEntry({ type: "openDirectory"}, onEntry);

    function onEntry(entry) {
      var i = 0, name;
      do { name = entry.name + (i ? ("-" + i) : ""); } while (++i && name in repos);
      newRepo(name, function (err, repo) {
        if (err) return callback(err);
        importEntry(repo, entry, function (err, root) {
          if (err) return callback(err);
          repo.root = root;
          repo.name = name;
          saveRoots();
          callback(null, repo);
        });
      });
    }
  }

  function newEmpty(callback) {
    var i = 0, name;
    do { name = "new" + (i ? ("-" + i) : ""); } while (++i && name in repos);
    newRepo(name, function (err, repo) {
      if (err) return callback(err);
      repo.saveAs("tree", [], function (err, hash) {
        if (err) return callback(err);
        repo.name = name;
        repo.root = hash;
        saveRoots();
        callback(null, repo);
      });
    });
  }

});