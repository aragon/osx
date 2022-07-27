// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../core/permission/PermissionManager.sol";
import "../core/IDAO.sol";

contract DAOMock is IDAO, PermissionManager {
    mapping(uint256 => uint256) public totalSupply;
    mapping(address => mapping(uint256 => uint256)) public pastVotes;

    constructor(address initialOwner) initializer {
        __PermissionManager_init(initialOwner);
    }

    function hasPermission(
        address, /* _where */
        address, /* _who */
        bytes32, /* _permissionId */
        bytes memory /* _data */
    ) public pure override returns (bool) {
        return true;
    }

    function getTrustedForwarder() public pure override returns (address) {
        return address(0);
    }

    function setTrustedForwarder(
        address /* _trustedForwarder */
    ) external override {}

    function setMetadata(
        bytes calldata /* _metadata */
    ) external override {}

    function execute(uint256 callId, Action[] memory _actions)
        external
        override
        returns (bytes[] memory)
    {
        bytes[] memory results;
        emit Executed(msg.sender, callId, _actions, results);
        return results;
    }

    function deposit(
        address, /* _token */
        uint256, /* _amount */
        string calldata /* _reference */
    ) external payable override {}

    function withdraw(
        address, /* _token */
        address, /* _to */
        uint256, /* _amount */
        string memory /* _reference */
    ) public override {}

    function setSignatureValidator(
        address /* _signatureValidator */
    ) external override {}

    function isValidSignature(
        bytes32, /* _hash */
        bytes memory /* _signature */
    ) external pure override returns (bytes4) {
        return 0x0;
    }
}
