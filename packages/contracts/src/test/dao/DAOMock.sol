// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../../core/permission/PermissionManager.sol";
import "../../core/dao/IDAO.sol";

contract DAOMock is IDAO, PermissionManager {
    mapping(uint256 => uint256) public totalSupply;
    mapping(address => mapping(uint256 => uint256)) public pastVotes;

    constructor(address initialOwner) initializer {
        __PermissionManager_init(initialOwner);
    }

    function hasPermission(
        address /* _where */,
        address /* _who */,
        bytes32 /* _permissionId */,
        bytes memory /* _data */
    ) public pure override returns (bool) {
        return true;
    }

    function getTrustedForwarder() public pure override returns (address) {
        return address(0);
    }

    function setTrustedForwarder(address /* _trustedForwarder */) external override {}

    function setMetadata(bytes calldata /* _metadata */) external override {}

    function execute(
        bytes32 callId,
        Action[] memory _actions,
        uint256 allowFailureMap
    ) external override returns (bytes[] memory execResults, uint256 failureMap) {
        (allowFailureMap);
        emit Executed(msg.sender, callId, _actions, allowFailureMap, failureMap, execResults);
    }

    function deposit(
        address /* _token */,
        uint256 /* _amount */,
        string calldata /* _reference */
    ) external payable override {}

    function setSignatureValidator(address /* _signatureValidator */) external override {}

    function isValidSignature(
        bytes32 /* _hash */,
        bytes memory /* _signature */
    ) external pure override returns (bytes4) {
        return 0x0;
    }

    function registerStandardCallback(
        bytes4 _interfaceId,
        bytes4 _callbackSelector,
        bytes4 _magicNumber
    ) external override {}
}
