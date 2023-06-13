FROM node:16

RUN ls -l
RUN mkdir /contracts
ADD ./contracts /contracts
ADD ./contracts-versions /contracts-versions

WORKDIR /contracts-versions
RUN yarn install

WORKDIR /contracts
RUN yarn install

EXPOSE 8545

CMD [ "yarn", "dev" ]