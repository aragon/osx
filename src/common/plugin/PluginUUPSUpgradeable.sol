// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC1822ProxiableUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/draft-IERC1822Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {IProtocolVersion} from "../utils/versioning/IProtocolVersion.sol";
import {ProtocolVersion} from "../utils/versioning/ProtocolVersion.sol";
import {DaoAuthorizableUpgradeable} from "../permission/auth/DaoAuthorizableUpgradeable.sol";
import {IPlugin} from "./IPlugin.sol";
import {IDAO} from "../dao/IDAO.sol";
import {IExecutor, Action} from "../executors/IExecutor.sol";

/// @title PluginUUPSUpgradeable
/// @author Aragon X - 2022-2024
/// @notice An abstract, upgradeable contract to inherit from when creating a plugin being deployed via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
/// @custom:security-contact sirt@aragon.org
abstract contract PluginUUPSUpgradeable is
    IPlugin,
    ERC165Upgradeable,
    UUPSUpgradeable,
    DaoAuthorizableUpgradeable,
    ProtocolVersion
{
    using ERC165CheckerUpgradeable for address;

    // NOTE: When adding new state variables to the contract, the size of `_gap` has to be adapted below as well.

    /// @notice Stores the current target configuration, defining the target contract and operation type for a plugin.
    TargetConfig private currentTargetConfig;

    /// @notice Thrown when target is of type 'IDAO', but operation is `delegateCall`.
    /// @param targetConfig The target config to update it to.
    error InvalidTargetConfig(TargetConfig targetConfig);

    /// @notice Thrown when `delegatecall` fails.
    error DelegateCallFailed();

    /// @notice Thrown when initialize is called after it has already been executed.
    error AlreadyInitialized();

    /// @notice Emitted each time the TargetConfig is set.
    event TargetSet(TargetConfig newTargetConfig);

    /// @notice The ID of the permission required to call the `setTargetConfig` function.
    bytes32 public constant SET_TARGET_CONFIG_PERMISSION_ID =
        keccak256("SET_TARGET_CONFIG_PERMISSION");

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PLUGIN_PERMISSION_ID = keccak256("UPGRADE_PLUGIN_PERMISSION");

    /// @notice Disables the initializers on the implementation contract to prevent it from being left uninitialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice This ensures that the initialize function cannot be called during the upgrade process.
    modifier onlyCallAtInitialization() {
        if (_getInitializedVersion() != 0) {
            revert AlreadyInitialized();
        }

        _;
    }

    /// @inheritdoc IPlugin
    function pluginType() public pure override returns (PluginType) {
        return PluginType.UUPS;
    }

    /// @notice Returns the currently set target contract.
    /// @return TargetConfig The currently set target.
    function getCurrentTargetConfig() public view virtual returns (TargetConfig memory) {
        return currentTargetConfig;
    }

    /// @notice A convenient function to get current target config only if its target is not address(0), otherwise dao().
    /// @return TargetConfig The current target config if its target is not address(0), otherwise returns dao()."
    function getTargetConfig() public view virtual returns (TargetConfig memory) {
        TargetConfig memory targetConfig = currentTargetConfig;

        if (targetConfig.target == address(0)) {
            targetConfig = TargetConfig({target: address(dao()), operation: Operation.Call});
        }

        return targetConfig;
    }

    /// @notice Initializes the plugin by storing the associated DAO.
    /// @param _dao The DAO contract.
    // solhint-disable-next-line func-name-mixedcase
    function __PluginUUPSUpgradeable_init(IDAO _dao) internal virtual onlyInitializing {
        __DaoAuthorizableUpgradeable_init(_dao);
    }

    /// @dev Sets the target to a new target (`newTarget`).
    ///      The caller must have the `SET_TARGET_CONFIG_PERMISSION_ID` permission.
    /// @param _targetConfig The target Config containing the address and operation type.
    function setTargetConfig(
        TargetConfig calldata _targetConfig
    ) public auth(SET_TARGET_CONFIG_PERMISSION_ID) {
        _setTargetConfig(_targetConfig);
    }

    /// @notice Checks if an interface is supported by this or its parent contract.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == type(IPlugin).interfaceId ||
            _interfaceId == type(IProtocolVersion).interfaceId ||
            _interfaceId == type(IERC1822ProxiableUpgradeable).interfaceId ||
            _interfaceId ==
            this.setTargetConfig.selector ^
                this.getTargetConfig.selector ^
                this.getCurrentTargetConfig.selector ||
            super.supportsInterface(_interfaceId);
    }

    /// @notice Returns the address of the implementation contract in the [proxy storage slot](https://eips.ethereum.org/EIPS/eip-1967) slot the [UUPS proxy](https://eips.ethereum.org/EIPS/eip-1822) is pointing to.
    /// @return The address of the implementation contract.
    function implementation() public view returns (address) {
        return _getImplementation();
    }

    /// @notice Sets the target to a new target (`newTarget`).
    /// @param _targetConfig The target Config containing the address and operation type.
    function _setTargetConfig(TargetConfig memory _targetConfig) internal virtual {
        // safety check to avoid setting dao as `target` with `delegatecall` operation
        // as this would not work and cause the plugin to be bricked.
        if (
            _targetConfig.target.supportsInterface(type(IDAO).interfaceId) &&
            _targetConfig.operation == Operation.DelegateCall
        ) {
            revert InvalidTargetConfig(_targetConfig);
        }

        currentTargetConfig = _targetConfig;

        emit TargetSet(_targetConfig);
    }

    /// @notice Forwards the actions to the currently set `target` for the execution.
    /// @dev If target is not set, passes actions to the dao.
    /// @param _callId Identifier for this execution.
    /// @param _actions actions that will be eventually called.
    /// @param _allowFailureMap Bitmap-encoded number.
    /// @return execResults address of the implementation contract.
    /// @return failureMap address of the implementation contract.
    function _execute(
        bytes32 _callId,
        Action[] memory _actions,
        uint256 _allowFailureMap
    ) internal virtual returns (bytes[] memory execResults, uint256 failureMap) {
        TargetConfig memory targetConfig = getTargetConfig();

        return
            _execute(
                targetConfig.target,
                _callId,
                _actions,
                _allowFailureMap,
                targetConfig.operation
            );
    }

    /// @notice Forwards the actions to the `target` for the execution.
    /// @param _target The address of the target contract.
    /// @param _callId Identifier for this execution.
    /// @param _actions actions that will be eventually called.
    /// @param _allowFailureMap A bitmap allowing the execution to succeed, even if individual actions might revert.
    ///     If the bit at index `i` is 1, the execution succeeds even if the `i`th action reverts.
    ///     A failure map value of 0 requires every action to not revert.
    /// @param _op The type of operation (`Call` or `DelegateCall`) to be used for the execution.
    /// @return execResults address of the implementation contract.
    /// @return failureMap address of the implementation contract.
    function _execute(
        address _target,
        bytes32 _callId,
        Action[] memory _actions,
        uint256 _allowFailureMap,
        Operation _op
    ) internal virtual returns (bytes[] memory execResults, uint256 failureMap) {
        if (_op == Operation.DelegateCall) {
            bool success;
            bytes memory data;

            // solhint-disable-next-line avoid-low-level-calls
            (success, data) = _target.delegatecall(
                abi.encodeCall(IExecutor.execute, (_callId, _actions, _allowFailureMap))
            );

            if (!success) {
                if (data.length > 0) {
                    // solhint-disable-next-line no-inline-assembly
                    assembly {
                        let returndata_size := mload(data)
                        revert(add(32, data), returndata_size)
                    }
                } else {
                    revert DelegateCallFailed();
                }
            }
            (execResults, failureMap) = abi.decode(data, (bytes[], uint256));
        } else {
            (execResults, failureMap) = IExecutor(_target).execute(
                _callId,
                _actions,
                _allowFailureMap
            );
        }
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeability mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PLUGIN_PERMISSION_ID` permission.
    function _authorizeUpgrade(
        address
    )
        internal
        virtual
        override
        auth(UPGRADE_PLUGIN_PERMISSION_ID)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
