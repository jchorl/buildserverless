emulate:
	docker container run -it --rm \
		--name buildserverless-emulate \
		-v $(PWD):/buildserverless \
		-w /buildserverless \
		jchorl/buildserverless sh -c 'npm install -g @google-cloud/functions-emulator; functions start; functions deploy build --trigger-http; bash'

build:
	docker image build -t jchorl/buildserverless .

node:
	docker container run -it --rm \
		-v $(PWD):/buildserverless \
		-w /buildserverless \
		node bash
