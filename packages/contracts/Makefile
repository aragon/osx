#!/bin/bash

include .env

t:
	forge script blax --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --broadcast --slow --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER) -vvvv

o:
	forge script DeployHere --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) --broadcast --slow --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier $(VERIFIER) -vvvv


h:
	forge script Helper --chain $(CHAIN) --rpc-url $(NETWORK_RPC_URL) -vvvv