// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

import {Errors} from "../../lib/Errors.sol";
import {ChainIds} from "../../lib/ChainIds.sol";

import {BaseAdapter} from "../BaseAdapter.sol";
import {IBaseAdapter} from "../IBaseAdapter.sol";

/// @title CCIPAdapter
/// @notice Chainlink CCIP implementation of `IBaseAdapter`.
/// @dev  The caller must call `sendMessage` via delegate call because:
///          1. It's a controller that pays, not adapter.
///          2. sender on the remote adapter must be crosschain controller, not the adapter.
/// @custom:security-contact sirt@aragon.org
contract CCIPAdapter is IERC165, IAny2EVMMessageReceiver, BaseAdapter {
    using SafeERC20 for IERC20;

    /// @notice The CCIP Router address.
    IRouterClient public immutable CCIP_ROUTER;

    /// @notice The fee token used to pay bridge fees.
    ///         `address(0)` = chain's native currency.
    /// @dev a storage read here would resolve against
    ///      the controller's slots under `delegatecall`.
    ///      Changing the fee token requires a new adapter.
    address public immutable FEE_TOKEN;

    /// @notice The receive function must only allow CCIP router.
    modifier onlyRouter() {
        if (msg.sender != address(CCIP_ROUTER)) {
            revert Errors.CALLER_NOT_CCIP_ROUTER();
        }

        _;
    }

    /// @param _crosschainController The owning controller.
    /// @param _ccipRouter The CCIP router on this chain.
    /// @param _feeToken The fee token, or `address(0)` for native. IMMUTABLE.
    /// @param _trustedRemoteConfigs The remote trusted config.
    constructor(
        address _crosschainController,
        address _ccipRouter,
        address _feeToken,
        TrustedRemoteConfig[] memory _trustedRemoteConfigs
    ) BaseAdapter(_crosschainController, _trustedRemoteConfigs) {
        if (_ccipRouter == address(0)) revert Errors.ZERO_ADDRESS();

        CCIP_ROUTER = IRouterClient(_ccipRouter);
        FEE_TOKEN = _feeToken;
    }

    /// @inheritdoc IBaseAdapter
    function quoteFee(
        address _receiver,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) public view override returns (address, uint256) {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();

        // Reverts if not set.
        uint64 nativeChainId = SafeCast.toUint64(
            toNativeChainId(_destinationChainId)
        );

        return (
            FEE_TOKEN,
            CCIP_ROUTER.getFee(
                nativeChainId,
                _buildMessage(_receiver, _gasLimit, _message, FEE_TOKEN)
            )
        );
    }

    /// @inheritdoc IBaseAdapter
    function sendMessage(
        address _receiver,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) public payable override returns (bytes32 messageId, uint256 fee) {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();

        // Reverts if not set.
        uint64 nativeChainId = SafeCast.toUint64(
            toNativeChainId(_destinationChainId)
        );

        Client.EVM2AnyMessage memory ccipMessage = _buildMessage(
            _receiver,
            _gasLimit,
            _message,
            FEE_TOKEN
        );

        // CCIP does not refund overpayment, so quote and pay exactly.
        fee = CCIP_ROUTER.getFee(nativeChainId, ccipMessage);

        // `address(this)` is the CONTROLLER here: it is the fee payer.
        if (FEE_TOKEN == address(0)) {
            uint256 balance = address(this).balance;
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(
                    address(0),
                    fee,
                    balance
                );
            }

            messageId = CCIP_ROUTER.ccipSend{value: fee}(
                nativeChainId,
                ccipMessage
            );
        } else {
            // Native value would be stranded in the controller's balance while
            // an ERC20 fee is due; surface the mistake instead.
            if (msg.value != 0) revert Errors.UNEXPECTED_NATIVE_VALUE();

            uint256 balance = IERC20(FEE_TOKEN).balanceOf(address(this));
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(FEE_TOKEN, fee, balance);
            }

            // The Router pulls the fee via `transferFrom` from the CONTROLLER,
            // which is the account granting the allowance under `delegatecall`.
            IERC20(FEE_TOKEN).forceApprove(address(CCIP_ROUTER), fee);

            messageId = CCIP_ROUTER.ccipSend(nativeChainId, ccipMessage);

            // Leave no standing allowance on the controller.
            IERC20(FEE_TOKEN).forceApprove(address(CCIP_ROUTER), 0);
        }
    }

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(
        Client.Any2EVMMessage calldata message
    ) external onlyRouter {
        address srcAddress = abi.decode(message.sender, (address));

        // Transform CCIP's chain selector into the standard chain Id.
        uint256 originChainId = fromNativeChainId(message.sourceChainSelector);

        if (
            srcAddress == address(0) ||
            _trustedRemotes[originChainId] != srcAddress
        ) {
            revert Errors.REMOTE_NOT_TRUSTED();
        }

        _forwardMessage(message.messageId, message.data, originChainId);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == type(IAny2EVMMessageReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _buildMessage(
        address _receiver,
        uint256 _gasLimit,
        bytes memory _message,
        address _feeToken
    ) internal pure returns (Client.EVM2AnyMessage memory) {
        bytes memory extraArgs = Client._argsToBytes(
            Client.GenericExtraArgsV2({
                gasLimit: _gasLimit,
                allowOutOfOrderExecution: true
            })
        );

        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(_receiver),
                data: _message,
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: extraArgs,
                feeToken: _feeToken
            });
    }

    // -------------------------------------------------------------------------
    // Chain id mapping
    // -------------------------------------------------------------------------

    /// @inheritdoc IBaseAdapter
    function toNativeChainId(
        uint256 _chainId
    ) public view virtual override returns (uint256) {
        if (_chainId == ChainIds.ETHEREUM) {
            return uint64(5009297550715157269);
        } else if (_chainId == ChainIds.AVALANCHE) {
            return uint64(6433500567565415381);
        } else if (_chainId == ChainIds.POLYGON) {
            return uint64(4051577828743386545);
        } else if (_chainId == ChainIds.BNB) {
            return uint64(11344663589394136015);
        } else if (_chainId == ChainIds.CELO) {
            return uint64(1346049177634351622);
        } else if (_chainId == ChainIds.SONIC) {
            return uint64(1673871237479749969);
        } else if (_chainId == ChainIds.PLASMA) {
            return uint64(9335212494177455608);
        } else if (_chainId == ChainIds.MONAD) {
            return uint64(8481857512324358265);
        } else if (_chainId == ChainIds.BASE) {
            return uint64(15971525489660198786);
        } else if (_chainId == ChainIds.ARBITRUM_ONE) {
            return uint64(4949039107694359620);
        }
        revert Errors.UNKNOWN_CHAIN_ID(_chainId);
    }

    /// @inheritdoc IBaseAdapter
    function fromNativeChainId(
        uint256 _chainId
    ) public view virtual override returns (uint256) {
        if (_chainId == uint64(5009297550715157269)) {
            return ChainIds.ETHEREUM;
        } else if (_chainId == uint64(6433500567565415381)) {
            return ChainIds.AVALANCHE;
        } else if (_chainId == uint64(4051577828743386545)) {
            return ChainIds.POLYGON;
        } else if (_chainId == uint64(11344663589394136015)) {
            return ChainIds.BNB;
        } else if (_chainId == uint64(1346049177634351622)) {
            return ChainIds.CELO;
        } else if (_chainId == uint64(1673871237479749969)) {
            return ChainIds.SONIC;
        } else if (_chainId == uint64(9335212494177455608)) {
            return ChainIds.PLASMA;
        } else if (_chainId == uint64(8481857512324358265)) {
            return ChainIds.MONAD;
        } else if (_chainId == uint64(15971525489660198786)) {
            return ChainIds.BASE;
        } else if (_chainId == uint64(4949039107694359620)) {
            return ChainIds.ARBITRUM_ONE;
        }
        revert Errors.UNKNOWN_NATIVE_CHAIN_ID(_chainId);
    }
}
