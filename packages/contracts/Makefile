#!/bin/bash

include .env


simulateDeployment: 
	forge script FactoryDeploy --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --slow  -vvvv

deployBlax:
	forge script DeployHere --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --slow --verify --broadcast --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER) -vvvv

deploy-repos:
	

t:
	forge script blax --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --broadcast --slow --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER) -vvvv

o:
	forge script DeployHere --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --slow --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER) -vvvv


h:
	forge script Helper --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) -vvvv