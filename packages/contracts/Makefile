#!/bin/bash

include .env


deploy-framework-simulate: 
	forge script FactoryDeploy --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --slow  -vvvv

deploy-framework:
	forge script FactoryDeploy --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --broadcast --slow -vvvv

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