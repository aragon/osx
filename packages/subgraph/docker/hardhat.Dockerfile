FROM node:20-alpine3.19

COPY ./hardhat /hardhat
WORKDIR /hardhat
RUN yarn install

EXPOSE 8545

CMD [ "yarn", "hardhat", "node", "--hostname", "0.0.0.0"]
