FROM google/cloud-sdk

RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_7.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @google-cloud/functions-emulator
