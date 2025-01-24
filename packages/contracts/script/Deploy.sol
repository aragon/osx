// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.8;

import {Script} from "forge-std/Script.sol";

import {Factory} from "../src/Giorgi.sol";
import {console} from "forge-std/console.sol";

contract DeployHere is Script {
    function setUp() public {}

    uint256 internal deployerPrivateKey = vm.envUint("PRIVATE_KEY");

    function run() public {
        vm.startBroadcast(deployerPrivateKey);

        string memory bytecode = vm.readFile(
            "./repos/compiled/multisig/src_MultisigSetup_sol_MultisigSetup.bin"
        );

        address deployedAddress = deployContract(bytecode);

        console.log("Deployed Contract Address:", deployedAddress);

        vm.stopBroadcast();
    }

    function deployContract(string memory bytecode) internal returns (address) {
        bytes memory bytecodeBytes = bytes(vm.parseBytes(bytecode));
        address addr;
        assembly {
            addr := create(0, add(bytecodeBytes, 0x20), mload(bytecodeBytes))
        }
        require(addr != address(0), "Deployment failed");
        return addr;
    }
}

// 1. forge script Deploy --rpc-url https://eth-sepolia.g.alchemy.com/v2/mg30IxlrcylGVkEcxvDOn6CXLbZx_n01 --chain sepolia --broadcast
// 2. Copy/paste arg 1 and arg 2 printed below and put it in `args.txt` file with space-separated.
// 2. forge verify-contract 0x706A53a465Dc2C380934B959Aea347151fCB8101 Giorgi --optimizer-runs 200 --chain sepolia --etherscan-api-key B4KUYGG32C6GNRGJS5EA365E68GU7GNI5C --constructor-args-path file.txt --watch
