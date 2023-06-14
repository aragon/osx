FROM node:16

RUN mkdir /osx
ADD . /osx
WORKDIR /osx

RUN apt-get update
RUN apt-get install -y git

SHELL ["/bin/bash", "-c"]

WORKDIR /osx/packages/contracts-versions
RUN yarn install

WORKDIR /osx/packages/contracts
RUN yarn install

EXPOSE 8545

CMD [ "yarn", "dev" ]