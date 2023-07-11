FROM node:18

RUN mkdir /osx
ADD . /osx
WORKDIR /osx
RUN yarn install

WORKDIR /osx/packages/contracts-versions
RUN yarn build

WORKDIR /osx/packages/contracts
RUN yarn build

EXPOSE 8545

CMD [ "yarn", "dev" ]