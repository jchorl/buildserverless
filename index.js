const execSync = require('child_process').execSync;
const fs = require('fs');
const fstream = require('fstream');
const path = require('path');
const request = require('request');
const storage = require('@google-cloud/storage');
const tar = require('tar');
const zlib = require('zlib');

// CONFIGURATION
const GITHUB_USERNAME = 'jchorl';
const REPO_NAME = 'sample-react-app';
const BUILD_DIR = './'; // the build will be executed in this directory, which is relative to the repo root
const BUILD_CMD = 'npm run build'; // the command to execute the build
const OUTPUT_DIR = './build'; // the output directory that should be zipped, relative to the repo root
const OUTPUT_BUCKET = 'buildserverless-builds'; // the packaged zip will be pushed to this GCS bucket on build completion

exports.buildserverless = function buildserverless(req, res) {
    // download the source code
    downloadSource(() => {

        // build the project
        build();

        // package up the build
        packageBuild(filename => {

            // upload the package
            uploadPackage(filename).then(() => {
                console.log('My work here is done. Returning.');
                res.status(200).end();
            });
        });
    });
};

// downloadSource downloads the source code into /tmp/app
function downloadSource(callback) {
    console.log('Downloading source code');
    githubClone(callback);
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

// packageBuild packages the build into a tarball
function packageBuild(callback) {
    console.log('Packaging up build');
    let filename = `/tmp/build-${(new Date).getTime()}.tar.gz`;

    fstream.Reader('/tmp/app/build')
        .pipe(tar.Pack())
        .pipe(zlib.createGzip({ level: 9 }))
        .pipe(fs.createWriteStream(filename))
        .on('finish', () => {
            callback(filename);
        });
}

// uploadPackage uploads the packaged build to GCS bucket OUTPUT_BUCKET
function uploadPackage(filename) {
    console.log('Pushing packaged build');
    let gcs = storage({
        projectId: 'buildserverless',
        keyFilename: path.join(__dirname, './credentials.json')
    });
    let bucket = gcs.bucket(OUTPUT_BUCKET);
    return bucket.upload(filename, { gzip: false }); // don't use gzip because the tarball is already gzipped
}

// githubClone clones a repo from Github
// most node Git clients don't work on Cloud Functions due to git dependencies, so do it manually
function githubClone(callback) {
    let url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/tarball/master`;
    let options = {
        url,
        headers: {
            'User-Agent': 'buildserverless' // Github API requires a User-Agent
        }
    }
    request(options)
        .on('response', res => {
            if (res.statusCode !== 200) {
                throw new Error('Status not 200');
            }

            res
                .pipe(zlib.createGunzip())
                .pipe(tar.Extract({ path: '/tmp/app', strip: 1 }))
                .on('finish', callback);
        })
        .on('error', err => {
            throw err
        });
}
