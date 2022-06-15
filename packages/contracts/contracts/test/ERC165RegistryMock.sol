// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/ERC165Registry.sol";

contract ERC165RegistryMock is ERC165Registry {
    event Registered(address);

    function initialize(IDAO _dao) external initializer {
        __ERC165Registry_init(_dao, type(IDAO).interfaceId);
    }

    function register(address registrant) external {
        _register(registrant);

        emit Registered(registrant);
    }
}
