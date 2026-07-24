// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

import {
    CCIPAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {
    BaseAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/BaseAdapter.sol";
import {
    IBaseAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/IBaseAdapter.sol";
import {
    CrossChainController
} from "@aragon/osx-commons-contracts/src/crosschain/CrossChainController.sol";
import {Errors} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {ChainIds} from "@aragon/osx-commons-contracts/src/crosschain/lib/ChainIds.sol";
import {
    Transaction,
    TransactionLib
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Transaction.sol";
import {Action} from "@aragon/osx-commons-contracts/src/executors/IExecutor.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {DAOMock} from "../../../../../mocks/commons/dao/DAOMock.sol";
import {ERC20Mock} from "../../../../../mocks/commons/token/ERC20Mock.sol";
import {
    CCIPRouterMock
} from "../../../../../mocks/commons/crosschain/CCIPRouterMock.sol";
import {
    DelegateCallerMock
} from "../../../../../mocks/commons/crosschain/DelegateCallerMock.sol";

/// @title CCIPAdapterBase
/// @notice Shared fixture for the per-function `CCIPAdapter` unit tests:
///         deploys the controller, router, fee token, and the several adapter
///         instances the suite needs, plus the inbound-message / lane helpers.
abstract contract CCIPAdapterBase is Test {
    // -------------------------------------------------------------------------
    // Real CCIP chain selectors / standard chain ids used throughout.
    // -------------------------------------------------------------------------

    uint64 internal constant SEL_ETH_MAINNET = 5009297550715157269;
    uint64 internal constant SEL_BASE = 15971525489660198786;
    uint64 internal constant SEL_ARBITRUM_ONE = 4949039107694359620;
    // A real CCIP selector the adapter does NOT map (Sepolia is intentionally
    // absent from the production map), used to exercise the unmapped path.
    uint64 internal constant SEL_SEPOLIA = 16015286601757825753;

    // Standard chain ids come from `ChainIds` (src/common/crosschain/lib).
    uint256 internal constant CHAIN_ETH_MAINNET = ChainIds.ETHEREUM;
    uint256 internal constant CHAIN_BASE = ChainIds.BASE;
    uint256 internal constant CHAIN_ARBITRUM_ONE = ChainIds.ARBITRUM_ONE;

    // -------------------------------------------------------------------------
    // Events re-declared locally so `vm.expectEmit` can match by signature
    // (solc 0.8.17 cannot `emit Contract.Event(...)` for externally-defined
    // events).
    // -------------------------------------------------------------------------
    event MessageReceived(
        uint256 indexed originChainId,
        bytes32 indexed messageId,
        bytes32 indexed txId,
        bytes transaction
    );

    DAOMock internal daoMock;
    CrossChainController internal controller;
    CCIPRouterMock internal router;
    ERC20Mock internal feeTokenErc20;

    /// @dev Default adapter from `setUp`: native (`address(0)`) fee token.
    CCIPAdapter internal adapter;
    /// @dev A second adapter sharing `router`, but with `FEE_TOKEN = feeTokenErc20`.
    ///      `FEE_TOKEN` is immutable, so an ERC20-fee lane needs its own adapter
    ///      instance -- there is no setter to flip `adapter` itself over.
    CCIPAdapter internal erc20Adapter;

    /// @dev Drives the guard-isolation tests that the real controller cannot
    ///      reach (see `DelegateCallerMock`'s own docs).
    DelegateCallerMock internal delegateCallerMock;
    /// @dev An adapter whose `CROSS_CHAIN_CONTROLLER` is `delegateCallerMock`,
    ///      used only by those isolation tests.
    CCIPAdapter internal isolationAdapter;

    address internal alice;
    /// @dev The remote chain's CONTROLLER -- the address CCIP reports as the
    ///      message sender on receive, because the source-chain send is a
    ///      `delegatecall`. This is what `_trustedRemotes[chainId]` holds.
    address internal remoteController;
    /// @dev The remote chain's ADAPTER -- the bridge-level receiver, i.e. what
    ///      `CrossChainController.chainToAdapter[chainId].remoteAdapter` holds.
    ///      NEVER a valid value for `_trustedRemotes`.
    address internal remoteAdapter;

    function setUp() public virtual {
        alice = makeAddr("alice");
        remoteController = makeAddr("remoteController");
        remoteAdapter = makeAddr("remoteAdapter");

        daoMock = new DAOMock();
        controller = new CrossChainController(address(daoMock));
        router = new CCIPRouterMock();
        feeTokenErc20 = new ERC20Mock("Fee Token", "FEE");

        BaseAdapter.TrustedRemoteConfig[]
            memory trustedRemotes = new BaseAdapter.TrustedRemoteConfig[](1);
        trustedRemotes[0] = BaseAdapter.TrustedRemoteConfig({
            standardChainId: CHAIN_ETH_MAINNET,
            trustedRemote: remoteController
        });

        adapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(0), // native fee token
            trustedRemotes
        );

        erc20Adapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(feeTokenErc20),
            new BaseAdapter.TrustedRemoteConfig[](0)
        );

        delegateCallerMock = new DelegateCallerMock(IDAO(address(daoMock)));
        isolationAdapter = new CCIPAdapter(
            address(delegateCallerMock),
            address(router),
            address(feeTokenErc20),
            new BaseAdapter.TrustedRemoteConfig[](0)
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// @dev `DAOMock.hasPermission` is a single flag that authorizes EVERY
    ///      permission once toggled; only flip it inside tests that need it.
    function _grantAllPermissions() internal {
        daoMock.setHasPermissionReturnValueMock(true);
    }

    /// @dev Registers `localAdapter`/`remoteAdapterAddr` as the controller's
    ///      lane for `chainId`. Grants `UPDATE_CONFIG_PERMISSION` in the process.
    function _registerLane(
        uint256 chainId,
        address localAdapter,
        address remoteAdapterAddr
    ) internal {
        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = chainId;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = CrossChainController.ChainConfig({
            localAdapter: localAdapter,
            remoteAdapter: remoteAdapterAddr
        });
        controller.updateConfig(ids, configs);
    }

    /// @dev Clears a previously-registered lane (all-zero config).
    function _clearLane(uint256 chainId) internal {
        _grantAllPermissions();
        uint256[] memory ids = new uint256[](1);
        ids[0] = chainId;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        controller.updateConfig(ids, configs);
    }

    function _buildInbound(
        uint64 selector,
        address sender,
        bytes memory data
    ) internal pure returns (Client.Any2EVMMessage memory) {
        return
            Client.Any2EVMMessage({
                messageId: keccak256("default-inbound-message"),
                sourceChainSelector: selector,
                sender: abi.encode(sender),
                data: data,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            });
    }

    function _emptyActionsPayload() internal pure returns (bytes memory) {
        return abi.encode(new Action[](0));
    }
}
