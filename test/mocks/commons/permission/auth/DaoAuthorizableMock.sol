// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {DaoAuthorizable} from "@aragon/osx-commons-contracts/permission/auth/DaoAuthorizable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/dao/IDAO.sol";

/// @notice A mock contract containing a function protected by the `auth` modifier.
/// @dev DO NOT USE IN PRODUCTION!
contract DaoAuthorizableMock is DaoAuthorizable {
    bytes32 public constant AUTHORIZED_FUNC_PERMISSION_ID = keccak256("AUTHORIZED_FUNC_PERMISSION");

    constructor(IDAO _dao) DaoAuthorizable(_dao) {}

    function authorizedFunc()
        external
        auth(AUTHORIZED_FUNC_PERMISSION_ID)
    // solhint-disable-next-line no-empty-blocks
    {

    }
}
