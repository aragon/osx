// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/InterfaceBaseRegistry.sol";

contract InterfaceBaseRegistryMock is InterfaceBaseRegistry {
    event Registered(address);

    function initialize(IDAO _dao) external initializer {
        __InterfaceBaseRegistry_init(_dao, type(IDAO).interfaceId);
    }

    function register(address registrant) external {
        _register(registrant);

        emit Registered(registrant);
    }
}
