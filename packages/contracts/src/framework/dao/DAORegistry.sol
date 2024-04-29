// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {ENSSubdomainRegistrar} from "../utils/ens/ENSSubdomainRegistrar.sol";
import {InterfaceBasedRegistry} from "../utils/InterfaceBasedRegistry.sol";
import {isSubdomainValid} from "../utils/RegistryUtils.sol";

/// @title Register your unique DAO
/// @author Aragon Association - 2022-2023
/// @notice This contract provides the possibility to register a DAO.
/// @custom:security-contact sirt@aragon.org
contract DAORegistry is InterfaceBasedRegistry, ProtocolVersion {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    /// @notice Emitted when a new DAO is registered.
    /// @param dao The address of the DAO contract.
    /// @param creator The address of the creator.
    event DAORegistered(address indexed dao, address indexed creator);

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract.
    /// @param _managingDao the managing DAO address.
    function initialize(IDAO _managingDao) external initializer {
        __InterfaceBasedRegistry_init(_managingDao, type(IDAO).interfaceId);
    }

    /// @notice Registers a DAO by its address. If a non-empty subdomain name is provided that is not taken already, the DAO becomes the owner of the ENS name.
    /// @dev A subdomain is unique within the Aragon DAO framework and can get stored here.
    /// @param dao The address of the DAO contract.
    /// @param creator The address of the creator.
    function register(IDAO dao, address creator) external auth(REGISTER_DAO_PERMISSION_ID) {
        address daoAddr = address(dao);

        _register(daoAddr);

        emit DAORegistered(daoAddr, creator);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
