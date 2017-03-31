emulate:
	docker container run -it --rm \
		--name buildserverless-emulate \
		-v $(PWD):/buildserverless \
		-w /buildserverless \
		jchorl/buildserverless sh -c 'echo buildserverless | functions start; functions deploy buildserverless --trigger-http; bash'

build:
	docker image build -t jchorl/buildserverless .

node:
	docker container run -it --rm \
		-v $(PWD):/buildserverless \
		-w /buildserverless \
		node bash
