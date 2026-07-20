// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IBaseAdapter} from "./adapters/IBaseAdapter.sol";
import {DaoAuthorizable} from "../permission/auth/DaoAuthorizable.sol";
import {Action, IExecutor} from "../executors/IExecutor.sol";

import {IDAO} from "../dao/IDAO.sol";
import {Errors} from "./lib/Errors.sol";

contract CrossChainController is DaoAuthorizable {
    bytes32 public constant FORWARD_MESSAGE_PERMISSION_ID =
        keccak256("FORWARD_MESSAGE_PERMISSION");

    bytes32 public constant UPDATE_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_CONFIG_PERMISSION");

    /// @param localAdapter The address of adapter where cross chain controller will send a message on the same chain.
    /// @param remoteAdapter The address of adapter on remote chain that will receive the message.
    struct AdapterByChain {
        address localAdapter;
        address remoteAdapter;
    }

    // TODO: add
    event MessageForwarded();

    mapping(uint256 => AdapterByChain) public chainToAdapter;

    constructor(address _dao) DaoAuthorizable(IDAO(_dao)) {}

    /// @notice Allows to update adapters per each chain.
    function updateConfig(
        uint256[] memory _chainIds,
        AdapterByChain[] memory _adapters
    ) public auth(UPDATE_CONFIG_PERMISSION_ID) {
        if (_chainIds.length != _adapters.length)
            revert Errors.INVALID_LENGTH_MISMATCH();

        for (uint256 i = 0; i < _chainIds.length; i++) {
            chainToAdapter[_chainIds[i]] = _adapters[i];
        }
    }

    /// @notice The final destination for a message that arrives on remote chain.
    /// @param _payload The encoded Action[] message.
    /// @param _originChainId The origin chain id from which cross-chain message originated.
    function receiveMessage(
        bytes memory _payload,
        uint256 _originChainId
    ) public {
        Action[] memory actions = abi.decode(_payload, (Action[]));

        IExecutor(address(dao())).execute(bytes32(0), actions, 0);
    }

    /// @notice Entry point to receive a message and send it to cross-chain.
    /// @param _destinationChainId The standard chain id of remote chain.
    /// @param _gasLimit The gas limit that will be used for crosschain message execution.
    /// @param _message The encoded Action[] message.
    function forwardMessage(
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes memory _message
    ) public auth(FORWARD_MESSAGE_PERMISSION_ID) {
        AdapterByChain storage adapters = chainToAdapter[_destinationChainId];

        (bool success, bytes memory returnData) = adapters
            .localAdapter
            .delegatecall(
                abi.encodeCall(
                    IBaseAdapter.sendMessage,
                    (
                        adapters.remoteAdapter,
                        _gasLimit,
                        _destinationChainId,
                        _message
                    )
                )
            );

        if (!success) {
            revert Errors.SEND_MESSAGE_TO_ADAPTER_FAILED(returnData);
        }

        emit MessageForwarded();
    }
}
