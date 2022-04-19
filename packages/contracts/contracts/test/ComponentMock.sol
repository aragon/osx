// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/Component.sol";

contract ComponentMock is Component {
    function initialize(IDAO _dao) external initializer {
        __Component_init(_dao);
    }

    function msgSender() external view returns (address) {
        return _msgSender();
    }
}
