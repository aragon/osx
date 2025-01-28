// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.8;

import {Script, VmSafe} from "forge-std/Script.sol";

import {Factory} from "../src/Giorgi.sol";
import {console} from "forge-std/console.sol";
import {PlaceholderSetup} from "../src/framework/plugin/repo/placeholder/PlaceholderSetup.sol";
import {Helper} from "./Helper.sol";
import {DeployFrameworkFactory} from "../src/DeploymentFrameworkFactory.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

contract DeployHere is Script, Helper {
    using ProxyLib for address;

    function setUp() public {}

    uint256 internal deployerPrivateKey = vm.envUint("PRIVATE_KEY");

    function run() public {
        // vm.startBroadcast(deployerPrivateKey);

        // addr k = new PlaceholderSetup();
        // k.deployUUPSProxy();

        address[] memory addresses = new address[](16);
        // bases
        addresses[0] = address(0x8E219C447944dF7d8C936C6A893c52EE89b9fEd7);
        addresses[1] = address(0x45eF99AAe785997f498F421bc27A825a29481dB5);
        addresses[2] = address(1);
        addresses[3] = address(1);
        addresses[4] = address(1);
        // main framework contracts
        addresses[5] = address(1);
        addresses[6] = address(1);
        addresses[7] = address(1);
        addresses[8] = address(1);
        addresses[9] = address(1);
        addresses[10] = address(1);
        addresses[11] = address(1);
        addresses[12] = address(1);
        // other
        addresses[13] = address(1);
        addresses[14] = address(1);
        addresses[15] = address(1);

        // store this in a temp file just in case
        // `_storeDeploymentJSON` fails, so we can recover.
        string memory filePath = "./deployed_contracts_temp.json";
        vm.writeJson(vm.toString(abi.encode(addresses)), filePath);

        _storeDeploymentJSON(block.chainid, addresses);

        // _storeDeploymentJSON(block.chainid, addresses);
        // bytes32 deploymentTx = vm.txHash();
        // console.logBytes32(deploymentTx);

        // string memory bytecode = vm.readFile(
        //     "./repos/compiled/multisig/src_MultisigSetup_sol_MultisigSetup.bin"
        // );
        // PlaceholderSetup setup = new PlaceholderSetup();
        // string memory jsonObj = '{ "boolean": true, "number": 342, "obj1": { "foo": "bar" } }';
        // vm.writeJson(jsonObj, "./output/example2.json");

        // string memory jsonObj2 = '{ "key22": 444, "obj2": {} }';
        // vm.writeJson(jsonObj2, "./blax.json");

        // string memory json = "";
        // json = string(abi.encodePacked(json, '"addr1":"', vm.toString(address(1)), '",'));
        // json = string(abi.encodePacked(json, '"addr2":"', vm.toString(address(2)), '",'));
        // json = string(abi.encodePacked(json, '"addr3":"', vm.toString(address(3)), '"}'));

        // vm.writeJson(json, "./blax.json");

        // string memory v = "v1.3.0";

        // string memory finalJson = string(abi.encodePacked('{"', v, '": {'));

        // // Append AddresslistVotingSetup JSON object dynamically
        // finalJson = appendJson(
        //     finalJson,
        //     "AddresslistVotingSetup",
        //     "0x7a62da7B56fB3bfCdF70E900787010Bc4c9Ca42e",
        //     145462271,
        //     "0x6b427b56b4963a41da6a3e84b62b449480427823fb8f67e65357ae34122dc8b1"
        // );

        // // Append AddresslistVotingSetupImplementation JSON object dynamically
        // finalJson = appendJson(
        //     finalJson,
        //     "AddresslistVotingSetupImplementation",
        //     "0x2C9c5e8F559DBBEc962f7CCd295DBc4183cd2168",
        //     145462271,
        //     "0x6b427b56b4963a41da6a3e84b62b449480427823fb8f67e65357ae34122dc8b1"
        // );

        // finalJson = string(abi.encodePacked(finalJson, "}}"));

        // Write the complete JSON object to a file
        // vm.writeFile("./blax.json", finalJson);

        // vm.serializeAddress()
        // address deployedAddress = deployContract(bytecode);

        // console.log("Deployed Contract Address:", deployedAddress);

        // vm.stopBroadcast();
    }

    function appendJson(
        string memory baseJson,
        string memory key,
        string memory addr,
        uint256 blockNumber,
        string memory deploymentTx
    ) internal pure returns (string memory) {
        // If it's not the first object, add a comma
        if (bytes(baseJson)[bytes(baseJson).length - 1] != "{") {
            baseJson = string(abi.encodePacked(baseJson, ","));
        }

        // Append the new JSON object
        return
            string(
                abi.encodePacked(
                    baseJson,
                    '"',
                    key,
                    '": {',
                    '"address": "',
                    addr,
                    '",',
                    '"blockNumber": ',
                    vm.toString(blockNumber),
                    ",",
                    '"deploymentTx": "',
                    deploymentTx,
                    '"',
                    "}"
                )
            );
    }
}

// 1. forge script Deploy --rpc-url https://eth-sepolia.g.alchemy.com/v2/mg30IxlrcylGVkEcxvDOn6CXLbZx_n01 --chain sepolia --broadcast
// 2. Copy/paste arg 1 and arg 2 printed below and put it in `args.txt` file with space-separated.
// 2. forge verify-contract 0x706A53a465Dc2C380934B959Aea347151fCB8101 Giorgi --optimizer-runs 200 --chain sepolia --etherscan-api-key B4KUYGG32C6GNRGJS5EA365E68GU7GNI5C --constructor-args-path file.txt --watch
