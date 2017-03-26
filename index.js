const execSync = require('child_process').execSync;
const Git = require('nodegit');
const path = require('path');

// CONFIGURATION
const BUILD_DIR = './sample-app'; // the build will be executed in this directory, which is relative to the repo root
const BUILD_CMD = 'npm run build'; // the command to execute the build
const REPO_URL = 'https://github.com/jchorl/buildserverless'; // the repo to clone

function downloadSource() {
    return Git.Clone(REPO_URL, '/tmp/app');
}

exports.build = function build(req, res) {
    let fullBuildDir = path.join('/tmp/app', BUILD_DIR);
    downloadSource().then(() => {
        console.log('Source downloaded. Executing build.');
        let output = execSync(BUILD_CMD, {
            cwd: fullBuildDir
        });

        console.log('Build completed. Output:');
        console.log(output);
        console.log('My work here is done. Returning.');
        res.status(200).end();
    });
};
