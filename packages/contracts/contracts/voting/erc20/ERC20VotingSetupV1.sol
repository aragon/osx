// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../plugin/PluginSetup.sol";
import {GovernanceERC20} from "../../tokens/GovernanceERC20.sol";
import {GovernanceWrappedERC20} from "../../tokens/GovernanceWrappedERC20.sol";
import {MerkleMinter} from "../../tokens/MerkleMinter.sol";
import {MerkleDistributor} from "../../tokens/MerkleDistributor.sol";
import {IERC20MintableUpgradeable} from "../../tokens/IERC20MintableUpgradeable.sol";
import {ERC20Voting} from "./ERC20Voting.sol";

/// @title AllowlistVotingSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `ERC20Voting` plugin.
contract ERC20VotingSetupV1 is PluginSetup {
    using Address for address;
    using Clones for address;

    ERC20Voting private immutable erc20VotingBase;

    address private constant NO_ORACLE = address(0);

    /// @notice The address of the `GovernanceERC20` base contract to clone from.
    address public governanceERC20Base;

    /// @notice The address of the `GovernanceWrappedERC20` base contract to clone from.
    address public governanceWrappedERC20Base;

    /// @notice The address of the `MerkleMinter` base contract to clone from.
    address public merkleMinterBase;

    /// @notice The `MerkleDistributor` base contract used to initialize the `MerkleMinter` clones.
    MerkleDistributor public distributorBase;

    struct TokenSettings {
        address addr;
        string name;
        string symbol;
    }

    struct MintSettings {
        address[] receivers;
        uint256[] amounts;
    }

    error MintArrayLengthMismatch(uint256 receiversArrayLength, uint256 amountsArrayLength);

    constructor() {
        distributorBase = new MerkleDistributor();
        governanceERC20Base = address(new GovernanceERC20());
        governanceWrappedERC20Base = address(new GovernanceWrappedERC20());
        merkleMinterBase = address(new MerkleMinter());
        erc20VotingBase = new ERC20Voting();
    }

    /// @inheritdoc PluginSetup
    function prepareInstallationDataABI() external view virtual override returns (string memory) {
        return
            "(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration, tuple(address addr, string name, string symbol) tokenSettings, tuple(address[] receivers, address[] amounts) mintSettings)";
    }

    /// @inheritdoc PluginSetup
    function prepareInstallation(address _dao, bytes memory _data)
        external
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        IDAO dao = IDAO(_dao);

        // Decode data
        (
            uint64 participationRequiredPct,
            uint64 supportRequiredPct,
            uint64 minDuration,
            TokenSettings memory tokenSettings,
            MintSettings memory mintSettings
        ) = abi.decode(_data, (uint64, uint64, uint64, TokenSettings, MintSettings));

        if (mintSettings.receivers.length != mintSettings.amounts.length) {
            revert MintArrayLengthMismatch({
                receiversArrayLength: mintSettings.receivers.length,
                amountsArrayLength: mintSettings.amounts.length
            });
        }

        address token = tokenSettings.addr;
        bool isTokenGovernance = false;

        // Prepare helpers
        helpers = new address[](token != address(0) ? 1 : 2);

        if (token != address(0)) {
            if (!isGovernanceToken(token)) {
                token = governanceWrappedERC20Base.clone();
                // User already has a token. We need to wrap it in
                // GovernanceWrappedERC20 in order to make the token
                // include governance functionality.
                GovernanceWrappedERC20(token).initialize(
                    IERC20Upgradeable(tokenSettings.addr),
                    tokenSettings.name,
                    tokenSettings.symbol
                );
            } else {
                isTokenGovernance = true;
            }

            helpers[0] = token;
        } else {
            token = governanceERC20Base.clone();
            GovernanceERC20(token).initialize(dao, tokenSettings.name, tokenSettings.symbol);

            // Clone and initialize a `MerkleMinter`
            address merkleMinter = merkleMinterBase.clone();
            MerkleMinter(merkleMinter).initialize(
                dao,
                dao.getTrustedForwarder(),
                IERC20MintableUpgradeable(token),
                distributorBase
            );

            helpers[0] = token;
            helpers[1] = merkleMinter;
        }

        // Prepare plugin
        plugin = createERC1967Proxy(
            address(erc20VotingBase),
            abi.encodeWithSelector(
                ERC20Voting.initialize.selector,
                dao,
                dao.getTrustedForwarder(),
                participationRequiredPct,
                supportRequiredPct,
                minDuration,
                token
            )
        );

        // Prepare permissions
        if (tokenSettings.addr != address(0)) {
            permissions = new PermissionLib.ItemMultiTarget[](4);
        } else {
            permissions = new PermissionLib.ItemMultiTarget[](7);

            bytes32 tokenMintPermission = GovernanceERC20(token).MINT_PERMISSION_ID();
            bytes32 merkleMintPermission = MerkleMinter(helpers[1]).MERKLE_MINT_PERMISSION_ID();

            permissions[4] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                token,
                _dao,
                NO_ORACLE,
                tokenMintPermission
            );

            permissions[5] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                token,
                helpers[1],
                NO_ORACLE,
                tokenMintPermission
            );

            permissions[6] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                helpers[1],
                _dao,
                NO_ORACLE,
                merkleMintPermission
            );
        }

        // Set plugin permissions to be granted.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            erc20VotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            erc20VotingBase.UPGRADE_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            erc20VotingBase.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        permissions[3] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc PluginSetup
    function prepareUninstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc PluginSetup
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _helpers,
        bytes calldata _data
    ) external virtual override returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](5);

        // Set permissions to be Revoked.
        permissions[4] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc PluginSetup
    function getImplementationAddress() external view virtual override returns (address) {
        return address(erc20VotingBase);
    }

    function isGovernanceToken(address token) private returns (bool) {
        // Validate if token is ERC20
        // Not Enough Checks, but better than nothing.
        token.functionCall(
            abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
        );

        return IERC165(token).supportsInterface(type(IVotesUpgradeable).interfaceId);
    }
}
