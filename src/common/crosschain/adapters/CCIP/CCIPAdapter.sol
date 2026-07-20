// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    SafeCast
} from "openzeppelin-contracts/contracts/utils/math/SafeCast.sol";

import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

import {Errors} from "../../lib/Errors.sol";

import {BaseAdapter} from "../BaseAdapter.sol";
import {IBaseAdapter} from "../IBaseAdapter.sol";

contract CCIPAdapter is IERC165, IAny2EVMMessageReceiver, BaseAdapter {
    using SafeERC20 for IERC20;

    /// @notice The CCIP Router address.
    IRouterClient public immutable CCIP_ROUTER;

    /// @notice The fee token that will be used to pay for bridge fees.
    address public feeToken;

    /// @notice The receive function must only allow CCIP router.
    modifier onlyRouter() {
        if (msg.sender != address(CCIP_ROUTER)) {
            revert Errors.CALLER_NOT_CCIP_ROUTER();
        }

        _;
    }

    constructor(
        address _crosschainController,
        address _ccipRouter,
        address _feeToken,
        uint256[] memory _chainIds,
        address[] memory _trustedRemoteSenders
    ) BaseAdapter(_crosschainController, _chainIds, _trustedRemoteSenders) {
        CCIP_ROUTER = IRouterClient(_ccipRouter);
        feeToken = _feeToken;
    }

    function sendMessage(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) public returns (uint256) {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();

        // TODO: shall we add to only be allowed to call from crosschain controller.

        // Transform standard chain id into chainlink's custom chainId.
        uint64 destChainId = SafeCast.toUint64(
            toNativeChainId(_destinationChainId)
        );

        // Build CCIP message.
        bytes memory extraArgs = Client._argsToBytes(
            Client.GenericExtraArgsV2({
                gasLimit: _gasLimit,
                allowOutOfOrderExecution: true
            })
        );

        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: _message,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: extraArgs,
            feeToken: address(feeToken)
        });

        // get fees of how much it will cost to send a message.
        uint256 fees = CCIP_ROUTER.getFee(destChainId, ccipMessage);

        if (IERC20(feeToken).balanceOf(address(this)) < fees) {
            revert Errors.NOT_ENOUGH_TO_PAY_BRIDGE();
        }

        bytes32 messageId = CCIP_ROUTER.ccipSend(destChainId, ccipMessage);

        return uint256(messageId);
    }

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(
        Client.Any2EVMMessage calldata message
    ) external onlyRouter {
        address srcAddress = abi.decode(message.sender, (address));

        // Transform adapter's chainId into standard chain Id.
        uint256 originChainId = fromNativeChainId(message.sourceChainSelector);

        if (
            srcAddress == address(0) ||
            _trustedRemotes[originChainId] != srcAddress
        ) {
            revert Errors.REMOTE_NOT_TRUSTED();
        }

        _forwardMessage(message.data, originChainId);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == type(IAny2EVMMessageReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /// @inheritdoc IBaseAdapter
    function toNativeChainId(
        uint256 _chainId
    ) public pure virtual override returns (uint256) {
        return _chainId;
    }

    /// @inheritdoc IBaseAdapter
    function fromNativeChainId(
        uint256 _chainId
    ) public pure virtual override returns (uint256) {
        return _chainId;
    }
}
