// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IDAO} from "../../core/IDAO.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {DaoAuthorizableUpgradeable} from "../../core/component/dao-authorizable/DaoAuthorizableUpgradeable.sol";

/// @title ENSSubdomainRegistrar
/// @author Aragon Association - 2022
/// @notice This contract registers ENS subdomains under a parent domain specified in the initialization process and maintains ownership of the subdomain since only the resolver address is set. This contract must either be the domain node owner or an approved operator of the node owner. The default resolver being used is the one specified in the parent domain.
contract ENSSubdomainRegistrar is UUPSUpgradeable, DaoAuthorizableUpgradeable {
    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_REGISTRAR_PERMISSION_ID =
        keccak256("UPGRADE_REGISTRAR_PERMISSION");

    /// @notice The ID of the permission required to call the `registerSubnode` and `setDefaultResolver` function.
    bytes32 public constant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID =
        keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");

    /// @notice The ENS registry contract
    ENS private ens;

    /// @notice The namehash of the domain on which subdomains are registered.
    bytes32 public node;

    /// @notice The address of the ENS resolver resolving the names to an address.
    address public resolver;

    /// @notice Thrown if the registrar is not authorized and is neither the domain node owner nor an approved operator of the domain node owner.
    /// @param nodeOwner The node owner.
    /// @param here The address of this registry.
    error UnauthorizedRegistrar(address nodeOwner, address here);

    /// @notice Thrown if the subnode is already registered.
    /// @param subnode The subnode namehash.
    /// @param nodeOwner The node owner address.
    error AlreadyRegistered(bytes32 subnode, address nodeOwner);

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
        bytes32 _node
    ) external initializer {
        address nodeOwner = _ens.owner(_node); // The `initializer` modifier acts as a re-entrancy guard so doing an external calls early is ok.

        // This contract must either be the domain node owner or an approved operator of the node owner.
        if (nodeOwner != address(this) && !_ens.isApprovedForAll(nodeOwner, address(this))) {
            revert UnauthorizedRegistrar({nodeOwner: nodeOwner, here: address(this)});
        }

        __DaoAuthorizableUpgradeable_init(_managingDao);

        ens = _ens;
        node = _node;
        resolver = ens.resolver(_node);
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_REGISTRAR_PERMISSION_ID` permission.
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(UPGRADE_REGISTRAR_PERMISSION_ID)
    {}

    /// @notice Registers a new subdomain with this registrar as the owner and set the target address in the resolver.
    /// @param _label The labelhash of the subdomain name.
    /// @param _targetAddress The address to which the subdomain resolves.
    function registerSubnode(bytes32 _label, address _targetAddress)
        external
        auth(REGISTER_ENS_SUBDOMAIN_PERMISSION_ID)
    {
        bytes32 subnode = keccak256(abi.encodePacked(node, _label));
        address currentOwner = ens.owner(subnode);

        if (currentOwner != address(0)) {
            revert AlreadyRegistered(subnode, currentOwner);
        }

        ens.setSubnodeOwner(node, _label, address(this));
        ens.setResolver(subnode, resolver);
        Resolver(resolver).setAddr(subnode, _targetAddress);
    }

    /// @notice Sets the default resolver contract address that the subdomains being registered will use.
    /// @param _resolver The resolver contract to be used.
    function setDefaultResolver(Resolver _resolver)
        external
        auth(REGISTER_ENS_SUBDOMAIN_PERMISSION_ID)
    {
        resolver = address(_resolver);
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[47] private __gap;
}
