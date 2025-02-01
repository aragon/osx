#!/bin/bash

include .env

### Some values in .env might be with quotes, so we strip them off 
### to make it work with forge commands.
CHAIN := $(shell echo $(CHAIN) | sed "s/[\"']//g")
NETWORK_RPC_URL := $(shell echo $(NETWORK_RPC_URL) | sed "s/[\"']//g")
ETHERSCAN_API_KEY := $(shell echo $(ETHERSCAN_API_KEY) | sed "s/[\"']//g")
VERIFIER := $(shell echo $(VERIFIER) | sed "s/[\"']//g")
VERIFIER_URL := $(shell echo $(VERIFIER_URL) | sed "s/[\"']//g")

### 1. To deploy the framework with simulation, run "make deploy-framework".
### 2. To deploy the framework without simulation, run "make broadcast=true deploy-framework".
###	   Etherscan verification only occurs if the network name is not local.
deploy-framework:
	rm -rf deployed-contracts.json
	rm -rf deployed-contracts-temp.json
	@command="forge script FactoryDeploy --rpc-url $(NETWORK_RPC_URL) --slow -vvvv"; \
	if [ "$(broadcast)" = "true" ]; then \
		command="$$command --broadcast"; \
	fi; \
	if [ "$(NETWORK_NAME)" != "local" ] && [ "$(broadcast)" = "true" ]; then \
		command="$$command --chain $(CHAIN) --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER)"; \
		if [ -n "$(VERIFIER_URL)" ]; then \
			command="$$command --verifier-url $(VERIFIER_URL)"; \
		fi; \
	fi; \
	echo "Running: $$command"; \
	$$command
	@CHAIN_ID=$(shell cast chain-id --rpc-url $(NETWORK_RPC_URL)); \
	echo "Chain ID is $$CHAIN_ID"; \
	npx ts-node scripts/store-deployments.ts $$CHAIN_ID $$(cat deployed-contracts-temp.json)

### In case the deployment worked, but store-deployments.ts failed for some reason:
### run `make chain-id=CHAIN_ID framework-store-json` which will create deployed-contracts.json with all the information.
framework-store-json:
	@if [ -z "$(chain-id)" ]; then \
		echo "Error: chain id is not set. Please pass it as 'make chain-id=<value> framework-store-json'."; \
		exit 1; \
	fi
	npx ts-node scripts/store-deployments.ts $(chain-id) $$(cat deployed-contracts-temp.json)

deploy-repos:
	@bash scripts/deploy-repos.sh $(fork)

install-plugin:
	@npx ts-node scripts/install-plugin-helper.ts
