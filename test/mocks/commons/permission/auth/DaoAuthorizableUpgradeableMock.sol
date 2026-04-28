// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {DaoAuthorizableUpgradeable} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

/// @notice A mock contract containing a function protected by the `auth` modifier.
/// @dev DO NOT USE IN PRODUCTION!
contract DaoAuthorizableUpgradeableMock is DaoAuthorizableUpgradeable {
    bytes32 public constant AUTHORIZED_FUNC_PERMISSION_ID = keccak256("AUTHORIZED_FUNC_PERMISSION");

    function initialize(IDAO _dao) external initializer {
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    /// @notice The following function intentionally misses the `initializer` modifier
    /// to validate that `__DaoAuthorizableUpgradeable_init` cannot be called outside initialization.
    function notAnInitializer(IDAO _dao) external {
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    function authorizedFunc()
        external
        auth(AUTHORIZED_FUNC_PERMISSION_ID) // solhint-disable-next-line no-empty-blocks
    {}
}
