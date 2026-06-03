// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Addresslist} from "@aragon/osx-commons-contracts/plugin/extensions/governance/Addresslist.sol";

/// @notice A mock addresslist that everyone can add and remove addresses to and from, respectively.
/// @dev DO NOT USE IN PRODUCTION!
contract AddresslistMock is Addresslist {
    function addAddresses(address[] calldata _newAddresses) external {
        _addAddresses(_newAddresses);
    }

    function removeAddresses(address[] calldata _exitingAddresses) external {
        _removeAddresses(_exitingAddresses);
    }
}
