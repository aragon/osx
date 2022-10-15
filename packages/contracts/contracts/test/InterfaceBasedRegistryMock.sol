// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {InterfaceBasedRegistry} from "../registry/interface-based-registry/InterfaceBasedRegistry.sol";
import { IDAO } from '../core/IDAO.sol';

contract InterfaceBasedRegistryMock is InterfaceBasedRegistry {
    bytes32 public constant REGISTER_PERMISSION_ID = keccak256("REGISTER_PERMISSION");

    event Registered(address);

    constructor(IDAO _dao) InterfaceBasedRegistry(_dao, type(IDAO).interfaceId) {}

    function register(address registrant) external auth(REGISTER_PERMISSION_ID) {
        _register(registrant);

        emit Registered(registrant);
    }
}
