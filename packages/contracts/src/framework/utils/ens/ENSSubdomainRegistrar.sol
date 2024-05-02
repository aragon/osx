// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {DaoAuthorizableUpgradeable} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {InterfaceBasedRegistry} from "../../utils/InterfaceBasedRegistry.sol";
import {PluginRepo} from "../../plugin/repo/PluginRepo.sol";

/// @title ENSSubdomainRegistrar
/// @author Aragon Association - 2022-2023
/// @notice This contract registers ENS subdomains under a parent domain specified in the initialization process and maintains ownership of the subdomain since only the resolver address is set. This contract must either be the domain node owner or an approved operator of the node owner. The default resolver being used is the one specified in the parent domain.
/// @custom:security-contact sirt@aragon.org
contract ENSSubdomainRegistrar is UUPSUpgradeable, DaoAuthorizableUpgradeable, ProtocolVersion {
    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_REGISTRAR_PERMISSION_ID =
        keccak256("UPGRADE_REGISTRAR_PERMISSION");

    /// @notice The ID of the permission required to call the `registerSubnode` and `setDefaultResolver` function.
    bytes32 public constant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID =
        keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");

    /// @notice The ENS registry contract
    ENS public ens;

    /// @notice The namehash of the domain on which subdomains are registered.
    bytes32 public node;

    /// @notice The address of the ENS resolver resolving the names to an address.
    address public resolver;

    InterfaceBasedRegistry public registry;

    /// @notice Thrown if the subnode is already registered.
    /// @param subnode The subnode namehash.
    /// @param nodeOwner The node owner address.
    error AlreadyRegistered(bytes32 subnode, address nodeOwner);
    error NotRegistered(bytes32 subnode, address nodeOwner);

    /// @notice Thrown if node's resolver is invalid.
    /// @param node The node namehash.
    /// @param resolver The node resolver address.
    error InvalidResolver(bytes32 node, address resolver);
    error Unauthorized();

    /// @dev Used to disallow initializing the implementation contract by an attacker for extra safety.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the component by
    /// - checking that the contract is the domain node owner or an approved operator
    /// - initializing the underlying component
    /// - registering the [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID
    /// - setting the ENS contract, the domain node hash, and resolver.
    /// @param _managingDao The interface of the DAO managing the components permissions.
    /// @param _ens The interface of the ENS registry to be used.
    /// @param _node The ENS parent domain node under which the subdomains are to be registered.
    function initialize(
        IDAO _managingDao,
        ENS _ens,
        InterfaceBasedRegistry _registry,
        bytes32 _node
    ) external initializer {
        __DaoAuthorizableUpgradeable_init(_managingDao);

        ens = _ens;
        node = _node;
        registry = _registry;

        address nodeResolver = ens.resolver(_node);

        if (nodeResolver == address(0)) {
            revert InvalidResolver({node: _node, resolver: nodeResolver});
        }

        resolver = nodeResolver;
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_REGISTRAR_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_REGISTRAR_PERMISSION_ID) {}

    modifier isAllowed(
        bool isRegistered,
        bool isPlugin,
        address _targetAddress
    ) {
        if (!isRegistered) revert Unauthorized();

        if (isPlugin) {
            if (
                !PluginRepo(_targetAddress).isGranted(
                    _targetAddress,
                    _msgSender(),
                    PluginRepo(_targetAddress).MAINTAINER_PERMISSION_ID(),
                    bytes("")
                )
            ) revert Unauthorized();
        }

        _;
    }

    function registerSubnode(
        bytes32 _label
    ) external isAllowed(registry.entries(_msgSender()), false, address(0)) {
        // is a registered dao
        _registerSubnode(_label, _msgSender());
    }

    /// @notice Registers a new subdomain with this registrar as the owner and set the target address in the resolver.
    /// @dev It reverts with no message if this contract isn't the owner nor an approved operator for the given node.
    /// @param _label The labelhash of the subdomain name.
    /// @param _targetAddress The address to which the subdomain resolves.
    function registerSubnode(
        bytes32 _label,
        address _targetAddress
    ) external isAllowed(registry.entries(_targetAddress), true, _targetAddress) {
        // is registered plugin and the caller has maintainer permission
        _registerSubnode(_label, _targetAddress);
    }

    function _registerSubnode(bytes32 _label, address _targetAddress) internal {
        bytes32 subnode = keccak256(abi.encodePacked(node, _label));
        address currentOwner = ens.owner(subnode);

        if (currentOwner != address(0)) {
            revert AlreadyRegistered(subnode, currentOwner);
        }

        ens.setSubnodeOwner(node, _label, address(this));
        ens.setResolver(subnode, resolver);
        Resolver(resolver).setAddr(subnode, _targetAddress);

        // TODO add the reverse registrar record as highlighted by Cristiano
    }

    function unregisterSubnode(
        bytes32 _label
    ) external isAllowed(registry.entries(_msgSender()), false, address(0)) {
        // is a registered dao
        _unregisterSubnode(_label);
    }

    function unregisterSubnode(
        bytes32 _label,
        address _targetAddress
    ) external isAllowed(registry.entries(_targetAddress), true, _targetAddress) {
        // is registered plugin and the caller has maintainer permission
        _unregisterSubnode(_label);
    }

    function _unregisterSubnode(bytes32 _label) internal {
        // ! mock implementation, need to review the correct way to unregister a subdomain
        bytes32 subnode = keccak256(abi.encodePacked(node, _label));
        address currentOwner = ens.owner(subnode);

        if (currentOwner != address(this)) {
            revert NotRegistered(subnode, currentOwner);
        }

        ens.setSubnodeOwner(node, _label, address(0));
        ens.setResolver(subnode, address(0));
        Resolver(resolver).setAddr(subnode, address(0));

        // TODO unregister the reverse registrar
    }

    /// @notice Sets the default resolver contract address that the subdomains being registered will use.
    /// @param _resolver The resolver contract to be used.
    function setDefaultResolver(
        address _resolver
    ) external auth(REGISTER_ENS_SUBDOMAIN_PERMISSION_ID) {
        if (_resolver == address(0)) {
            revert InvalidResolver({node: node, resolver: _resolver});
        }

        resolver = _resolver;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[47] private __gap;
}
