# Buildserverless
Buildserverless is an example of how to build Node.js builds on serverless platforms (specifically Google Cloud Functions)

## Getting it running
1. [Create a Google Cloud project and enable the GCS API](https://support.google.com/cloud/answer/6158841?hl=en)
2. [Generate Service Account Credentials](https://cloud.google.com/storage/docs/authentication#generating-a-private-key) and put those credentials in the project root in a file called credentials.json
3. Modify the configuration constants in index.js to match your application (to start, you can just modify the OUTPUT_BUCKET)
4. [Deploy the Cloud Function](https://cloud.google.com/sdk/gcloud/reference/beta/functions/deploy) called `buildserverless` (if you use Docker, modify the `deploy` target in the Makefile and call `make deploy`)

## How it works
At a high level, the steps are pretty simple:
1. Download source code — simply clone a Github repo.
2. Run the build — execute a build command that you would execute on the command line, like `npm run build`.
3. Package the build results — since the build might output multiple files, it is easiest to package all those results into a tarball and compress it so it can be pushed somewhere else…
4. Push the results — Cloud Functions execute in temporary environments, so the build results must be pushed somewhere persistent to be utilized later. Having them packaged and compressed makes this easier and saves on network egress. I chose to push the packaged build to GCS, but it can really be pushed anywhere.
