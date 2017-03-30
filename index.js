const archiver = require('archiver');
const execSync = require('child_process').execSync;
const fs = require('fs');
const Git = require('nodegit');
const path = require('path');
const storage = require('@google-cloud/storage');

// STEPS
// download source
// execute build
// package up build output
// execute onPackageComplete

// CONFIGURATION
const REPO_URL = 'https://github.com/jchorl/sample-react-app'; // the source repo to clone
const BUILD_DIR = './'; // the build will be executed in this directory, which is relative to the repo root
const BUILD_CMD = 'npm run build'; // the command to execute the build
const OUTPUT_DIR = './build'; // the output directory that should be zipped, relative to the repo root
const OUTPUT_BUCKET = 'buildserverless-builds'; // the packaged zip will be pushed to this GCS bucket on build completion

exports.run = function run(req, res) {
    downloadSource().then(() => {
        build();
        packageBuild((filename) => {
            uploadPackage(filename).then(() => {
                console.log('My work here is done. Returning.');
                res.status(200).end();
            });
        });
    });
};

// downloadSource downloads the source code into /tmp/app
function downloadSource() {
    console.log('Downloading source code');
    return Git.Clone(REPO_URL, '/tmp/app');
}

// build executes the build in /tmp/app/BUILD_DIR
function build() {
    let fullBuildDir = path.join('/tmp/app', BUILD_DIR);
    console.log('Executing build');
    let output = execSync(BUILD_CMD, {
        cwd: fullBuildDir
    });

    console.log('Build completed. Output:');
    console.log(output.toString('utf8'));
    console.log();
}

// packageBuild packages the build and passes the filename to the callback as a parameter
function packageBuild(callback) {
    console.log('Packaging up build');
    let filename = `/tmp/build-${(new Date).getTime()}.zip`;

    // rest of function packages up into a zip, based on https://github.com/archiverjs/node-archiver
    let output = fs.createWriteStream(filename);
    var archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    // listen for all archive data to be written
    output.on('close', function() {
        console.log('Packaging complete');
        console.log('Compressed build size: ' + archive.pointer() + ' total bytes');
        callback && callback(filename);
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
        throw err;
    });

    // pipe archive data to the file
    archive.pipe(output);

    // append files from the build output directory
    archive.directory(path.join('/tmp/app', OUTPUT_DIR));

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    archive.finalize();
}

// uploadPackage uploads the packaged build to GCS bucket OUTPUT_BUCKET
function uploadPackage(filename) {
    console.log('Pushing packaged build');
    let gcs = storage({
        projectId: 'buildserverless',
        keyFilename: path.join(__dirname, './credentials.json')
    });
    let bucket = gcs.bucket(OUTPUT_BUCKET);
    return bucket.upload(filename, { gzip: true });
}
