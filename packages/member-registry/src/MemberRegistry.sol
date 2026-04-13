// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {DaoAuthorizableUpgradeable} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {isSubdomainValid} from "@aragon/osx/framework/utils/RegistryUtils.sol";

import {IMemberRegistry} from "./IMemberRegistry.sol";
import {MemberSubdomainRegistrar} from "./MemberSubdomainRegistrar.sol";

/// @title MemberRegistry
/// @author Aragon X - 2026
/// @notice Entry point for member self-registration via ENS subdomain claims. Validates input,
/// relays to MemberSubdomainRegistrar, emits events. Stateless — all mutable state lives in
/// the registrar.
/// @custom:security-contact sirt@aragon.org
contract MemberRegistry is IMemberRegistry, UUPSUpgradeable, DaoAuthorizableUpgradeable, ProtocolVersion {
    /// @notice The ID of the permission required to call `_authorizeUpgrade`.
    bytes32 public constant UPGRADE_REGISTRY_PERMISSION_ID =
        keccak256("UPGRADE_REGISTRY_PERMISSION");

    /// @notice The ID of the permission required to call `revoke`.
    bytes32 public constant REVOKE_MEMBER_PERMISSION_ID =
        keccak256("REVOKE_MEMBER_PERMISSION");

    /// @notice The registrar managing ENS subdomain state.
    MemberSubdomainRegistrar public registrar;

    /// @dev Disallow initializing the implementation contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the registry.
    /// @param _managingDao The DAO managing permissions.
    /// @param _registrar The MemberSubdomainRegistrar that manages ENS state.
    function initialize(
        IDAO _managingDao,
        MemberSubdomainRegistrar _registrar
    ) external initializer {
        __DaoAuthorizableUpgradeable_init(_managingDao);
        registrar = _registrar;
    }

    /// @inheritdoc IMemberRegistry
    function register(string calldata subdomain) external {
        _validateSubdomain(subdomain);

        bytes32 label = keccak256(bytes(subdomain));
        registrar.registerSubdomain(msg.sender, label, subdomain);

        emit MemberRegistered(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function release() external {
        string memory subdomain = registrar.releaseSubdomain(msg.sender);

        emit MemberReleased(msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function revoke(address member) external auth(REVOKE_MEMBER_PERMISSION_ID) {
        string memory subdomain = registrar.releaseSubdomain(member);

        emit MemberRevoked(member, msg.sender, subdomain);
    }

    /// @inheritdoc IMemberRegistry
    function rename(string calldata newSubdomain) external {
        _validateSubdomain(newSubdomain);

        bytes32 newLabel = keccak256(bytes(newSubdomain));
        string memory oldSubdomain = registrar.renameSubdomain(msg.sender, newLabel, newSubdomain);

        emit MemberRenamed(msg.sender, oldSubdomain, newSubdomain);
    }

    /// @dev Validates the subdomain: must be non-empty and contain only [0-9a-z-].
    function _validateSubdomain(string calldata subdomain) internal pure {
        if (bytes(subdomain).length == 0 || !isSubdomainValid(subdomain)) {
            revert InvalidSubdomain(subdomain);
        }
    }

    /// @notice Authorizes UUPS upgrades. Caller must have `UPGRADE_REGISTRY_PERMISSION_ID`.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_REGISTRY_PERMISSION_ID) {}

    /// @notice Reserved storage gap for future upgrades.
    uint256[49] private __gap;
}
