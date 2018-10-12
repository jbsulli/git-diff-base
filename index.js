#!/usr/bin/env node
const args = process.argv.slice(2);

const { exec, spawn } = require("child_process");
const lines = /(?:\r\n|\r|\n)/;

let file = args[args.length - 1];
let diffBranch = args.length === 3 ? args[1] : args.length === 2 ? args[0] : 'master';
let currentBranch = args.length === 3 ? args[0] : '';

function simpleChildProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    exec([command, ...(args || [])].join(' '), function(err, result, errstr) {
      if (err || errstr) {
        return reject(errstr || err);
      }
      return resolve(result);
    });
  });
}

function spawnDetatched(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, detached: true, stdio: [ 'ignore' ] });
    child.unref();
    resolve();
  });
}

function getCurrentBranch() {
  return new Promise((resolve, reject) => {
    if (currentBranch) return resolve(currentBranch);

    return simpleChildProcess('git', ['branch'])
      .then(str => {
        let branch;
        try {
          branch = str.split(lines)
            .find(line => line.charAt(0) === "*")
            .substr(2);
        } catch(err) {
          return reject(err);
        }
        resolve(branch);
      });
  });
}

function getMergeBase() {
  return simpleChildProcess('git', ['merge-base', currentBranch, diffBranch])
    .then(commit => commit.trim());
}

function showDiff(commit) {
  Promise.resolve()
    .then(spawnDetatched('git', ['difftool', '-y', commit + ':' + file, diffBranch + ':' + file]))
    .then(spawnDetatched('git', ['difftool', '-y', commit + ':' + file, currentBranch + ':' + file]));
}


getCurrentBranch()
  .then(branch => currentBranch = branch)
  .then(getMergeBase)
  .then(showDiff)
  .then(res => {
    process.exit(0);
  });