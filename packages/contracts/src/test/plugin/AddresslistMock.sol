// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "../../plugins/utils/Addresslist.sol";

contract AddresslistMock is Addresslist {
    function addAddresses(address[] calldata _newAddresses) external {
        _addAddresses(_newAddresses);
    }

    function removeAddresses(address[] calldata _exitingAddresses) external {
        _removeAddresses(_exitingAddresses);
    }
}
