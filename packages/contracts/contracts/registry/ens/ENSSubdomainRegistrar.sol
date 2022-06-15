// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";
import "../../core/component/Component.sol";

/// @title A registrar for ENS subdomains
/// @author Aragon Association - 2022
/// @notice This contract registers ENS subdomains under a parent domain specified in the initialization process
///         and maintains ownership of the subdomain since only the resolver address is set.
///         This contract must either be the domain node owner or an approved operator of the node owner.
///         During the subdomain initialization, the resolver specified in the parent domain is used.

contract ENSSubdomainRegistrar is Component {
    bytes4 internal constant REGISTRY_INTERFACE_ID =
        this.registerSubnode.selector ^ this.setResolver.selector;
    bytes32 public constant REGISTER_ENS_SUBDOMAIN_ROLE = keccak256("REGISTER_ENS_SUBDOMAIN_ROLE");

    ENS private ens;
    bytes32 public node;
    address public resolver;
    address public reverseRegistrar;

    /// @notice Thrown if the registrar is not authorized and is neither the domain node owner
    ///         nor an approved operator of the domain node owner
    /// @param nodeOwner The node owner
    /// @param here The address of this registry
    error RegistrarUnauthorized(address nodeOwner, address here);

    /// @notice Thrown if the subnode is already
    ///         nor an approved operator of the domain node owner
    /// @param subnode The subnode namehash
    /// @param nodeOwner The node owner address
    error AlreadyRegistered(bytes32 subnode, address nodeOwner);

    /// @notice Initializes the component
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _ens The interface of the ENS registry to be used
    /// @param _node The ENS parent domain node under which the subdomains are to be registered
    function initialize(
        IDAO _managingDao,
        ENS _ens,
        bytes32 _node
    ) external initializer {
        address nodeOwner = _ens.owner(_node);

        // This contract must either be the domain node owner or be an approved operator of the node owner
        if (!(nodeOwner == address(this) || _ens.isApprovedForAll(nodeOwner, address(this)))) {
            revert RegistrarUnauthorized({nodeOwner: nodeOwner, here: address(this)});
        }

        _registerStandard(REGISTRY_INTERFACE_ID);

        __Component_init(_managingDao);

        ens = _ens;
        node = _node;
        resolver = ens.resolver(_node);
    }

    /// @notice Registers a new subdomain with this registrar as the owner and set the target address in the resolver
    /// @param _label The labelhash of the subdomain name
    /// @param _targetAddress The address to which the subdomain resolves
    function registerSubnode(bytes32 _label, address _targetAddress)
        external
        auth(REGISTER_ENS_SUBDOMAIN_ROLE)
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

    /// @notice Sets the resolver contract address which the subdomains being registered will use
    /// @param _resolver The resolver contract to be used
    function setResolver(Resolver _resolver) external auth(REGISTER_ENS_SUBDOMAIN_ROLE) {
        resolver = address(_resolver);
    }
}
