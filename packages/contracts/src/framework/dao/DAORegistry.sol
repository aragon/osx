// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {ENSSubdomainRegistrar} from "../utils/ens/ENSSubdomainRegistrar.sol";
import {InterfaceBasedRegistry} from "../utils/InterfaceBasedRegistry.sol";
import {isSubdomainValid} from "../utils/RegistryUtils.sol";

/// @title Register your unique DAO subdomain
/// @author Aragon X - 2022-2023
/// @notice This contract provides the possibility to register a DAO.
/// @custom:security-contact sirt@aragon.org
contract DAORegistry is InterfaceBasedRegistry, ProtocolVersion {
    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    /// @notice The ENS subdomain registrar registering the DAO subdomains.
    ENSSubdomainRegistrar public subdomainRegistrar;

    /// @notice Thrown if the DAO subdomain doesn't match the regex `[0-9a-z\-]`
    error InvalidDaoSubdomain(string subdomain);

    /// @notice Thrown if the subdomain is present, but registrar is address(0).
    error ENSNotSupported();

    /// @notice Emitted when a new DAO is registered.
    /// @param dao The address of the DAO contract.
    /// @param creator The address of the creator.
    /// @param subdomain The DAO subdomain.
    event DAORegistered(address indexed dao, address indexed creator, string subdomain);

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract.
    /// @param _managingDao the managing DAO address.
    /// @param _subdomainRegistrar The `ENSSubdomainRegistrar` where `ENS` subdomain will be registered.
    function initialize(
        IDAO _managingDao,
        ENSSubdomainRegistrar _subdomainRegistrar
    ) external initializer {
        __InterfaceBasedRegistry_init(_managingDao, type(IDAO).interfaceId);
        subdomainRegistrar = _subdomainRegistrar;
    }

    /// @notice Registers a DAO by its address. If a non-empty subdomain name is provided that is not taken already, the DAO becomes the owner of the ENS name.
    /// @dev A subdomain is unique within the Aragon DAO framework and can get stored here.
    /// @param dao The address of the DAO contract.
    /// @param creator The address of the creator.
    /// @param subdomain The DAO subdomain.
    function register(
        IDAO dao,
        address creator,
        string calldata subdomain
    ) external auth(REGISTER_DAO_PERMISSION_ID) {
        address daoAddr = address(dao);

        _register(daoAddr);

        if ((bytes(subdomain).length > 0)) {
            if (address(subdomainRegistrar) == address(0)) {
                revert ENSNotSupported();
            }

            if (!isSubdomainValid(subdomain)) {
                revert InvalidDaoSubdomain({subdomain: subdomain});
            }

            bytes32 labelhash = keccak256(bytes(subdomain));

            subdomainRegistrar.registerSubnode(labelhash, daoAddr);
        }

        emit DAORegistered(daoAddr, creator, subdomain);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
