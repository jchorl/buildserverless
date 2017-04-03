UID=$(shell id -u)
GID=$(shell id -g)

emulate:
	docker container run -it --rm \
		--name buildserverless-emulate \
		-v $(PWD):/buildserverless:ro \
		-w /buildserverless \
		jchorl/buildserverless sh -c 'echo buildserverless | functions start; functions deploy buildserverless --trigger-http; bash'

build:
	docker image build -t jchorl/buildserverless .

deploy:
	docker container run -it --rm \
		-v $(PWD):/buildserverless:ro \
		-w /buildserverless \
		jchorl/buildserverless sh -c 'gcloud auth login; gcloud config set project buildserverless; gcloud beta functions deploy buildserverless --stage-bucket buildserverless-cloud-function --trigger-http --memory=2048MB --timeout=200s'

node:
	docker container run -it --rm \
		-u $(UID):$(GID) \
		-v $(PWD):/buildserverless \
		-w /buildserverless \
		node bash
