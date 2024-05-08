pragma solidity 0.8.17;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Test is UUPSUpgradeable {
    // uint256 public timestampHere = block.timestamp;

    // function good() public returns(uint256) {
    //     timestampHere = block.timestamp;
    // }

    function initialize() public {}

    function testHere(uint256 _startDate) public {
        if (_startDate < block.timestamp) {
            revert("fuckyeah");
        }
    }

    function _authorizeUpgrade(address) internal virtual override {}
}
