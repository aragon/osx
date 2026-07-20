// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Errors} from "../lib/Errors.sol";
import {CrossChainController} from "../CrossChainController.sol";
import {IBaseAdapter} from "./IBaseAdapter.sol";

abstract contract BaseAdapter is IBaseAdapter {
    /// @notice The address of crosschain controller.
    address public immutable CROSS_CHAIN_CONTROLLER;

    /// @notice standard chain id -> origin forwarder address.
    mapping(uint256 => address) internal _trustedRemotes;

    constructor(
        address _crossChainController,
        uint256[] memory _remoteChainIds,
        address[] memory _remoteTrustedSenders
    ) {
        CROSS_CHAIN_CONTROLLER = _crossChainController;

        if (_remoteChainIds.length != _remoteTrustedSenders.length) {
            revert Errors.INVALID_LENGTH_MISMATCH();
        }

        for (uint256 i = 0; i < _remoteChainIds.length; i++) {
            address remoteTrustedSender = _remoteTrustedSenders[i];
            if (remoteTrustedSender == address(0)) {
                revert Errors.TRUSTED_REMOTE_NOT_SET();
            }

            _trustedRemotes[_remoteChainIds[i]] = _remoteTrustedSenders[i];
        }
    }

    /// @notice Once adapter receives a message, this must be called
    ///         to redirect/forward it to CrossChainController.
    function _forwardMessage(
        bytes memory _payload,
        uint256 originChainId
    ) public {
        CrossChainController(CROSS_CHAIN_CONTROLLER).receiveMessage(
            _payload,
            originChainId
        );
    }
}
