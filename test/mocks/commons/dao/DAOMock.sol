// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {IExecutor, Action} from "../../../../src/common/executors/IExecutor.sol";

/// @notice A mock DAO that anyone can set permissions in.
/// @dev DO NOT USE IN PRODUCTION!
contract DAOMock is IDAO, IExecutor {
    bool public hasPermissionReturnValueMock;

    function setHasPermissionReturnValueMock(bool _hasPermissionReturnValueMock) external {
        hasPermissionReturnValueMock = _hasPermissionReturnValueMock;
    }

    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) external view override returns (bool) {
        (_where, _who, _permissionId, _data);
        return hasPermissionReturnValueMock;
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

    function execute(
        bytes32 callId,
        Action[] memory _actions,
        uint256 allowFailureMap
    ) external override returns (bytes[] memory execResults, uint256 failureMap) {
        emit Executed(msg.sender, callId, _actions, allowFailureMap, failureMap, execResults);
    }

    function deposit(
        address _token,
        uint256 _amount,
        string calldata _reference
    ) external payable override {
        (_token, _amount, _reference);
    }

    function setSignatureValidator(address _signatureValidator) external pure override {
        (_signatureValidator);
    }

    function isValidSignature(
        bytes32 _hash,
        bytes memory _signature
    ) external pure override returns (bytes4) {
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
