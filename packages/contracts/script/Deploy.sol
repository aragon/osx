// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.8;

import {Script} from "forge-std/Script.sol";

import {Factory} from "../src/Giorgi.sol";

contract DeployHere is Script {
    function setUp() public {}

    uint256 internal deployerPrivateKey = vm.envUint("DEPLOYER_KEY");

    function run() public {
        vm.startBroadcast(deployerPrivateKey);

        Factory g = new Factory();

        g.deployAnother();

        vm.stopBroadcast();
    }
}

// 1. forge script Deploy --rpc-url https://eth-sepolia.g.alchemy.com/v2/mg30IxlrcylGVkEcxvDOn6CXLbZx_n01 --chain sepolia --broadcast
// 2. Copy/paste arg 1 and arg 2 printed below and put it in `args.txt` file with space-separated.
// 2. forge verify-contract 0x706A53a465Dc2C380934B959Aea347151fCB8101 Giorgi --optimizer-runs 200 --chain sepolia --etherscan-api-key B4KUYGG32C6GNRGJS5EA365E68GU7GNI5C --constructor-args-path file.txt --watch
