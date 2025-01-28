#!/bin/bash

include .env

### Some values in .env might be with quotes, so we strip them off.
CHAIN := $(shell echo $(CHAIN) | sed "s/'//g")
NETWORK_RPC_URL := $(shell echo $(NETWORK_RPC_URL) | sed "s/'//g")
ETHERSCAN_API_KEY := $(shell echo $(ETHERSCAN_API_KEY) | sed "s/'//g")
VERIFIER := $(shell echo $(VERIFIER) | sed "s/'//g")

### 1. To deploy the framework with simulation, run "make deploy-framework".
### 2. To deploy the framework without simulation, run "make broadcast=true deploy-framework".
###	   Etherscan verification only occurs if the network name is not local.
deploy-framework:
	@command="forge script FactoryDeploy --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --slow -vvvv"; \
	[ "$(broadcast)" = "true" ] && command="$$command --broadcast"; \
	[ "$(NETWORK_NAME)" != "local" ] && [ "$(broadcast)" = "true" ] && command="$$command --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER)"; \
	echo "Running: $$command"; \
	$$command

### In case the deployment worked, but store-deployments.ts failed for some reason:
### run `make chain-id=CHAIN_ID framework-store-json` which will create deployed_contracts.json with all the information.
framework-store-json:
	@if [ -z "$(chain-id)" ]; then \
		echo "Error: chain id is not set. Please pass it as 'make chain-id=<value> framework-store-json'."; \
		exit 1; \
	fi
	npx ts-node scripts/store-deployments.ts $(chain-id) $$(cat deployed_contracts_temp.json)

deploy-repos:
	@if [ -z "$(pluginrepofactory)" ]; then \
		echo "Error: pluginrepofactory is not set. Please pass it as 'make pluginrepofactory=<value> ReposDeployment'."; \
		exit 1; \
	fi
	
	@bash bash.sh $(pluginrepofactory) $(fork)
