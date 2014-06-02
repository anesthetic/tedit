define("js-git/mixins/sync.js", ["carallel.js","js-git/lib/modes.js"], function (module, exports) { "use strict";

var carallel = require('carallel.js');
var modes = require('js-git/lib/modes.js');

module.exports = function (repo) {
  repo.sync = sync;
};

function sync(remote, options, callback) {
  /*jshint: validthis: true*/
  if (!callback) return sync.bind(this, remote, options);
  var local = this;
  if (typeof local.readRef !== "function") {
    throw new TypeError("local repo is missing readRef method");
  }
  if (typeof local.loadDirectAs !== "function") {
    throw new TypeError("local repo is missing loadDirectAs method");
  }
  if (typeof remote.readRef !== "function") {
    throw new TypeError("remote repo is missing readRef method");
  }
  console.log({
    local: local,
    remote: remote,
    options: options
  });
  var localRef = options.localRef || "refs/heads/master";
  var remoteRef = options.remoteRef || localRef;
  carallel({
    local: local.readRef(localRef),
    remote: remote.readRef(remoteRef)
  }, function (err, hashes) {
    if (err) return callback(err);
    if (hashes.local) throw "TODO: Implement local";
    console.log(hashes);
    var depth = options.localDepth || Infinity;
    downloadCommit(local, remote, hashes.remote, depth, function (err) {
      if (err) return callback(err);
      console.log("DOWNLOADED")
    });
  });
}

function downloadCommit(local, remote, hash, depth, callback) {
  if (!callback) return downloadCommit.bind(null, local, remote, hash, depth);

  var commit;

  local.loadDirectAs("commit", hash, onCheck);

  function onCheck(err, result) {
    if (err) return callback(err);

    if (result) {
      commit = result;
      return onSaved(null, hash);
    }
    remote.loadAs("commit", hash, onCommit);
  }

  function onCommit(err, result) {
    if (!result) return callback(err || new Error("Missing remote commit " + hash));

    commit = result;
    downloadTree(local, remote, commit.tree, onTree);

    function onTree(err) {
      if (err) return callback(err);
      local.saveAs("commit", commit, onSaved);
    }
  }

  function onSaved(err, newHash) {
    if (err) return callback(err);
    if (newHash !== hash) {
      console.error(commit);
      console.error({
        expected: hash,
        actual: newHash
      });
      return callback(new Error("Hash mismatch for commit"));
    }

    depth--;
    if (!depth || !commit.parents.length) return callback();
    carallel(commit.parents.map(function (parent) {
      return downloadCommit(local, remote, parent, depth);
    }), callback);
  }
}

function downloadTree(local, remote, hash, callback) {
  if (!callback) return downloadTree.bind(null, local, remote, hash);

  local.loadDirectAs("tree", hash, onCheck);

  function onCheck(err, tree) {
    if (err || tree) return callback(err);
    remote.loadAs("tree", hash, onTree);
  }

  function onTree(err, tree) {
    if (!tree) return callback(err || new Error("Missing remote tree " + hash));
    carallel(Object.keys(tree).map(function (name) {
      return downloadEntry(local, remote, tree[name]);
    }).filter(Boolean), function (err) {
      if (err) return callback(err);
      local.saveAs("tree", tree, onSaved);
    });

    function onSaved(err, newHash) {
      if (err) return callback(err);
      if (newHash !== hash) {
        console.error(tree);
        console.error({
          expected: hash,
          actual: newHash
        });
        return callback(new Error("Hash mismatch for tree"));
      }
      callback();
    }
  }
}

function downloadBlob(local, remote, hash, callback) {
  if (!callback) return downloadBlob.bind(null, local, remote, hash);

  local.loadDirectAs("blob", hash, function (err, blob) {
    if (err || blob) return callback(err);
    remote.loadAs("blob", hash, onBlob);
  });

  function onBlob(err, blob) {
    if (!blob) return callback(err || new Error("Missing remote blob " + hash));
    local.saveAs("blob", blob, onSaved);
  }

  function onSaved(err, newHash) {
    if (err) return callback(err);
    if (newHash !== hash) {
      console.error({
        expected: hash,
        actual: newHash
      });
      return callback(new Error("Hash mismatch for blob"));
    }
    callback();
  }
}

function downloadEntry(local, remote, entry) {
  if (entry.mode === modes.tree) return downloadTree(local, remote, entry.hash);
  if (modes.isBlob(entry.mode)) return downloadBlob(local, remote, entry.hash);
}

function findCommon(local, localHash, remote, remoteHash, callback) {

}

});
