// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {IExecutor, Action} from "../../../../src/common/executors/IExecutor.sol";

/// @notice A DAO mock purpose-built for `CrossChainController` tests.
/// @dev Differs from `DAOMock` in two ways the controller's suite needs:
///      - `hasPermission` is granted per `(where, who, permissionId)` instead
///        of one global bool, so a caller can be authorized for one
///        permission (e.g. `RETRY_MESSAGE_PERMISSION`) but not another.
///      - `execute` actually performs the actions (bubbling a real revert
///        reason on failure) instead of being a silent no-op, and can
///        additionally be forced to revert outright via
///        `setExecuteReverts`. This is required to exercise
///        `CrossChainController`'s defensive `try/catch` around
///        `executeActions` and the retry path with genuine pass/fail
///        outcomes.
/// @dev DO NOT USE IN PRODUCTION!
contract CrossChainControllerDAOMock is IDAO, IExecutor {
    /// @notice where => who => permissionId => granted.
    mapping(address => mapping(address => mapping(bytes32 => bool))) public permissions;

    /// @notice When true, `execute` reverts unconditionally before touching
    ///         any action, regardless of the granted permissions.
    bool public executeReverts;

    function setHasPermission(address _where, address _who, bytes32 _permissionId, bool _granted) external {
        permissions[_where][_who][_permissionId] = _granted;
    }

    function setExecuteReverts(bool _reverts) external {
        executeReverts = _reverts;
    }

    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) external view override returns (bool) {
        (_data);
        return permissions[_where][_who][_permissionId];
    }

    function getTrustedForwarder() public pure override returns (address) {
        return address(0);
    }

    function setTrustedForwarder(address _trustedForwarder) external pure override {
        (_trustedForwarder);
    }

    function setMetadata(bytes calldata _metadata) external pure override {
        (_metadata);
    }

    /// @dev Actually calls every action and reverts (bubbling the original
    ///      reason) on the first failure, mirroring the real `Executor`'s
    ///      default (`allowFailureMap == 0`) behaviour closely enough for
    ///      these tests: a reverting action makes `execute` revert.
    function execute(
        bytes32 callId,
        Action[] memory _actions,
        uint256 allowFailureMap
    ) external override returns (bytes[] memory execResults, uint256 failureMap) {
        if (executeReverts) {
            // solhint-disable-next-line reason-string, custom-errors
            revert("CrossChainControllerDAOMock: forced revert");
        }

        execResults = new bytes[](_actions.length);
        for (uint256 i = 0; i < _actions.length; i++) {
            (bool success, bytes memory result) = _actions[i].to.call{value: _actions[i].value}(_actions[i].data);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            execResults[i] = result;
        }

        emit Executed(msg.sender, callId, _actions, allowFailureMap, failureMap, execResults);
    }

    function deposit(address _token, uint256 _amount, string calldata _reference) external payable override {
        (_token, _amount, _reference);
    }

    function setSignatureValidator(address _signatureValidator) external pure override {
        (_signatureValidator);
    }

    function isValidSignature(bytes32 _hash, bytes memory _signature) external pure override returns (bytes4) {
        (_hash, _signature);
        return 0x0;
    }

    function registerStandardCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSelector,
        bytes4 _magicNumber
    ) external pure override {
        (_interfaceId, _callbackSelector, _magicNumber);
    }
}
