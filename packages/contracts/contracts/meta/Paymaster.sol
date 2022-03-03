/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@opengsn/contracts/src/BasePaymaster.sol";

import "../core/component/Permissions.sol";

/// @title The GSN paymaster paying for meta transaction
/// @author Michael Heuer - Aragon Association - 2022
/// @notice This contract pays for meta transactions from and to permissioned addresses as specified in the IDAO ACL
contract Paymaster is Initializable, BasePaymaster, UUPSUpgradeable, Permissions {

    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");
    bytes32 public constant PAYMASTER_SPONSORED_ROLE = keccak256("PAYMASTER_SPONSORED_ROLE");

    string internal constant ERROR_NOT_SPONSORED = "ERROR_NOT_SPONSORED";
    string internal constant ERROR_APPROVAL_DATA_LENGTH_INVALID = "ERROR_APPROVAL_DATA_LENGTH_INVALID";

    /// @dev Used for GSN IPaymaster compatability
    function versionPaymaster() external view override virtual returns (string memory){
        return "2.2.0";
    }

    /// @dev Used for UUPS upgradability pattern
    function initialize(
        IDAO _dao
    ) public virtual override initializer() {
        Permissions.initialize(_dao);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) {}
    
    function postRelayedCall(
        bytes calldata context,
        bool success,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    ) external override virtual {
        (context, success, gasUseWithoutPost, relayData);
    }

    function preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
    external
    override
    virtual
    returns (bytes memory context, bool revertOnRecipientRevert) {
        (signature, maxPossibleGas);
        // require(approvalData.length == 0, ERROR_APPROVAL_DATA_LENGTH_INVALID);
        // require(relayRequest.relayData.paymasterData.length == 0, ERROR_APPROVAL_DATA_LENGTH_INVALID);

        // require(
        //     dao.hasPermission(
        //         relayRequest.request.to,
        //         relayRequest.request.from,
        //         PAYMASTER_SPONSORED_ROLE,
        //         relayRequest.relayData.paymasterData
        //     ),
        //     ERROR_NOT_SPONSORED
        // );

        return ("", false);
    }
}
