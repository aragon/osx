/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./Paymaster.sol";

/// @title todo
/// @author Michael Heuer - Aragon Association - 2022
/// @notice todo
abstract contract IStreamPaymaster is Paymaster {

    function streamActive() virtual public view returns (bool);
    function streamBalance() virtual public view returns (uint256);
    function withdrawFromStream() virtual public;

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
        require(approvalData.length == 0, ERROR_APPROVAL_DATA_LENGTH_INVALID);
        require(relayRequest.relayData.paymasterData.length == 0, ERROR_APPROVAL_DATA_LENGTH_INVALID);

        require(
            dao.hasPermission(
                relayRequest.request.to,
                relayRequest.request.from,
                PAYMASTER_SPONSORED_ROLE,
                relayRequest.relayData.paymasterData
            ),
            ERROR_NOT_SPONSORED
        );

        if(streamActive()){
            withdrawFromStream();
        }

        return ("", false);
    }

    function postRelayedCall(
        bytes calldata context,
        bool success,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    ) external override virtual {
        (context, success, gasUseWithoutPost, relayData);
    }

}
