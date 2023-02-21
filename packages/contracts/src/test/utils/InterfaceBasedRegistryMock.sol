// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "../../framework/utils/InterfaceBasedRegistry.sol";

contract InterfaceBasedRegistryMock is InterfaceBasedRegistry {
    bytes32 public constant REGISTER_PERMISSION_ID = keccak256("REGISTER_PERMISSION");

    event Registered(address);

    function initialize(IDAO _dao) external initializer {
        __InterfaceBasedRegistry_init(_dao, type(IDAO).interfaceId);
    }

    function register(address registrant) external auth(REGISTER_PERMISSION_ID) {
        _register(registrant);

        emit Registered(registrant);
    }
}
