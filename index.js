const archiver = require('archiver');
const execSync = require('child_process').execSync;
const fs = require('fs');
const Git = require('nodegit');
const path = require('path');
const storage = require('@google-cloud/storage');
const zlib = require('zlib');

// CONFIGURATION
const REPO_URL = 'https://github.com/jchorl/sample-react-app'; // the source repo to clone
const BUILD_DIR = './'; // the build will be executed in this directory, which is relative to the repo root
const BUILD_CMD = 'npm run build'; // the command to execute the build
const OUTPUT_DIR = './build'; // the output directory that should be pushed to the GCS bucket, relative to the repo root
const OUTPUT_BUCKET = 'buildserverless-builds'; // OUTPUT_DIR will be pushed here on build completion

function downloadSource() {
    return Git.Clone(REPO_URL, '/tmp/app');
}

function packageBuild(callback) {
    let output = fs.createWriteStream('/tmp/build.zip');
    let archive = archiver('zip', {
        store: true // Sets the compression method to STORE.
    });

    // listen for all archive data to be written
    output.on('close', function() {
        console.log('Compressed build size: ' + archive.pointer() + ' total bytes');
        callback && callback();
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
        throw err;
    });

    // pipe archive data to the file
    archive.pipe(output);

    // append files from a directory
    archive.directory(path.join('/tmp/app', OUTPUT_DIR));

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    archive.finalize();
}

function uploadBuild() {
    let gcs = storage({
        projectId: 'buildserverless',
        keyFilename: path.join(__dirname, './credentials.json')
    });
    let bucket = gcs.bucket(OUTPUT_BUCKET);
    return bucket.upload('/tmp/build.zip', { gzip: true });
}

exports.build = function build(req, res) {
    let fullBuildDir = path.join('/tmp/app', BUILD_DIR);
    downloadSource().then(() => {
        console.log('Source downloaded. Executing build.');
        let output = execSync(BUILD_CMD, {
            cwd: fullBuildDir
        });

        console.log('Build completed. Output:');
        console.log(output.toString('utf8'));

        console.log('Packaging up build.');
        packageBuild(() => {
            console.log('Pushing results.');
            uploadBuild().then(() => {
                console.log('My work here is done. Returning.');
                res.status(200).end();
            });
        });
    });
};
