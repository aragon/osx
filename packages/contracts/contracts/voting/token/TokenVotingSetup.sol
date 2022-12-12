// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../plugin/PluginSetup.sol";
import {GovernanceERC20} from "../../tokens/GovernanceERC20.sol";
import {GovernanceWrappedERC20} from "../../tokens/GovernanceWrappedERC20.sol";
import {IGovernanceWrappedERC20} from "../../tokens/IGovernanceWrappedERC20.sol";
import {MerkleMinter} from "../../tokens/MerkleMinter.sol";
import {MerkleDistributor} from "../../tokens/MerkleDistributor.sol";
import {IERC20MintableUpgradeable} from "../../tokens/IERC20MintableUpgradeable.sol";
import {TokenVoting} from "./TokenVoting.sol";

/// @title TokenVotingSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `TokenVoting` plugin.
contract TokenVotingSetup is PluginSetup {
    using Address for address;
    using Clones for address;
    using ERC165Checker for address;

    /// @notice The address of the `TokenVoting` base contract.
    TokenVoting private immutable tokenVotingBase;

    /// @notice The address zero to be used as oracle address for permissions.
    address private constant NO_ORACLE = address(0);

    /// @notice The address of the `GovernanceERC20` base contract.
    address public immutable governanceERC20Base;

    /// @notice The address of the `GovernanceWrappedERC20` base contract.
    address public immutable governanceWrappedERC20Base;

    /// @notice The address of the `MerkleMinter` base contract.
    address public immutable merkleMinterBase;

    /// @notice The `MerkleDistributor` base contract used to initialize the `MerkleMinter`.
    address public immutable distributorBase;

    struct TokenSettings {
        address addr;
        string name;
        string symbol;
    }

    /// @notice Thrown if `MintSettings`'s params are not of the same length.
    /// @param receiversArrayLength The array length of `receivers`.
    /// @param amountsArrayLength The array length of `amounts`.
    error MintArrayLengthMismatch(uint256 receiversArrayLength, uint256 amountsArrayLength);

    /// @notice Thrown if token address is passed which is not a token.
    /// @param token The token address
    error TokenNotContract(address token);

    /// @notice Thrown if token address is not ERC20.
    /// @param token The token address
    error TokenNotERC20(address token);

    /// @notice Thrown if passed helpers array is of worng length.
    /// @param length The array length of passed helpers.
    error WrongHelpersArrayLength(uint256 length);

    /// @notice The contract constructor, that deployes the bases.
    constructor() {
        distributorBase = address(new MerkleDistributor());
        governanceERC20Base = address(
            new GovernanceERC20(
                IDAO(address(0)),
                "",
                "",
                GovernanceERC20.MintSettings(new address[](0), new uint256[](0))
            )
        );
        governanceWrappedERC20Base = address(
            new GovernanceWrappedERC20(IERC20Upgradeable(address(0)), "", "")
        );
        merkleMinterBase = address(new MerkleMinter());
        tokenVotingBase = new TokenVoting();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return
            "(uint64 totalSupportThresholdPct, uint64 relativeSupportThresholdPct, uint64 minDuration, tuple(address addr, string name, string symbol) tokenSettings, tuple(address[] receivers, uint256[] amounts) mintSettings)";
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory _data)
        external
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        IDAO dao = IDAO(_dao);

        // Decode `_data` to extract the params needed for deploying and initializing `TokenVoting` plugin,
        // and the required helpers
        (
            uint64 totalSupportThresholdPct,
            uint64 relativeSupportThresholdPct,
            uint64 minDuration,
            TokenSettings memory tokenSettings,
            // only used for GovernanceERC20(token is not passed)
            GovernanceERC20.MintSettings memory mintSettings
        ) = abi.decode(
                _data,
                (uint64, uint64, uint64, TokenSettings, GovernanceERC20.MintSettings)
            );

        // Check mint setting.
        if (mintSettings.receivers.length != mintSettings.amounts.length) {
            revert MintArrayLengthMismatch({
                receiversArrayLength: mintSettings.receivers.length,
                amountsArrayLength: mintSettings.amounts.length
            });
        }

        address token = tokenSettings.addr;

        // Prepare helpers.
        address[] memory helpers = new address[](1);

        if (token != address(0)) {
            // the following 2 calls(_getTokenInterfaceIds, isERC20) don't use
            // OZ's function calls due to the fact that OZ reverts in case of an error
            // which in this case not desirable as we still continue the execution.
            // Try/catch more unpredictable + messy.
            if (!token.isContract()) {
                revert TokenNotContract(token);
            }

            if (!_isERC20(token)) {
                revert TokenNotERC20(token);
            }

            // [0] = IERC20Upgradeable, [1] = IVotesUpgradeable, [2] = IGovernanceWrappedERC20
            bool[] memory supportedIds = _getTokenInterfaceIds(token);

            if (
                // If token supports none of them
                // it's simply ERC20 which gets checked by _isERC20
                // Currently, not a satisfiable check..
                (!supportedIds[0] && !supportedIds[1] && !supportedIds[2]) ||
                // If token supports IERC20Upgradeable, but neither
                // IVotes nor IGovernanceWrappedERC20, it needs wrapping.
                (supportedIds[0] && !supportedIds[1] && !supportedIds[2])
            ) {
                token = governanceWrappedERC20Base.clone();
                // User already has a token. We need to wrap it in
                // GovernanceWrappedERC20 in order to make the token
                // include governance functionality.
                GovernanceWrappedERC20(token).initialize(
                    IERC20Upgradeable(tokenSettings.addr),
                    tokenSettings.name,
                    tokenSettings.symbol
                );
            }
        } else {
            // Clone a `GovernanceERC20`.
            token = governanceERC20Base.clone();
            GovernanceERC20(token).initialize(
                dao,
                tokenSettings.name,
                tokenSettings.symbol,
                mintSettings
            );
        }

        helpers[0] = token;

        // Prepare and deploy plugin proxy.
        plugin = createERC1967Proxy(
            address(tokenVotingBase),
            abi.encodeWithSelector(
                TokenVoting.initialize.selector,
                dao,
                totalSupportThresholdPct,
                relativeSupportThresholdPct,
                minDuration,
                token
            )
        );

        // Prepare permissions
        PermissionLib.ItemMultiTarget[] memory permissions = new PermissionLib.ItemMultiTarget[](
            tokenSettings.addr != address(0) ? 3 : 4
        );

        // Set plugin permissions to be granted.
        // Grant the list of prmissions of the plugin to the DAO.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            tokenVotingBase.CHANGE_VOTE_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            tokenVotingBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );

        if (tokenSettings.addr == address(0)) {
            bytes32 tokenMintPermission = GovernanceERC20(token).MINT_PERMISSION_ID();

            permissions[3] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                token,
                _dao,
                NO_ORACLE,
                tokenMintPermission
            );
        }

        preparedDependency.helpers = helpers;
        preparedDependency.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external pure returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        view
        returns (PermissionLib.ItemMultiTarget[] memory permissions)
    {
        // Prepare permissions.
        uint256 helperLength = _payload.currentHelpers.length;
        if (helperLength != 1) {
            revert WrongHelpersArrayLength({length: helperLength});
        }

        // NOTE: No need to fully validate _helpers[0] as we're sure
        // it's either GovernanceWrappedERC20 or GovernanceERC20
        // which is ensured by PluginSetupProcessor that it can NOT pass helper
        // that wasn't deployed by the prepareInstall in this plugin setup.
        address token = _payload.currentHelpers[0];

        bool[] memory supportedIds = _getTokenInterfaceIds(token);

        // If it's IERC20Upgradeable, IVotesUpgradeable and not IGovernanceWrappedERC20
        // Then it's GovernanceERC20.
        bool isGovernanceERC20 = supportedIds[0] && supportedIds[1] && !supportedIds[2];

        permissions = new PermissionLib.ItemMultiTarget[](isGovernanceERC20 ? 4 : 3);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_ORACLE,
            tokenVotingBase.CHANGE_VOTE_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_ORACLE,
            tokenVotingBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );

        // We only need to revoke permission if the token deployed was GovernanceERC20
        // As GovernanceWrapped doesn't even have this permission on it.
        // TODO: depending on the decision if we don't revert on revokes when plugin setup processor
        // calls dao for the permissions, we might decide to include the below always as it will be
        // more gas less than checking isGovernanceERC20..
        if (isGovernanceERC20) {
            permissions[3] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                token,
                _dao,
                NO_ORACLE,
                GovernanceERC20(token).MINT_PERMISSION_ID()
            );
        }
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view virtual override returns (address) {
        return address(tokenVotingBase);
    }

    /// @notice gets the information which interface ids token supports.
    /// @dev it's important to check first whether token is a contract.
    /// @param token address
    function _getTokenInterfaceIds(address token) private view returns (bool[] memory) {
        bytes4[] memory interfaceIds = new bytes4[](3);
        interfaceIds[0] = type(IERC20Upgradeable).interfaceId;
        interfaceIds[1] = type(IVotesUpgradeable).interfaceId;
        interfaceIds[2] = type(IGovernanceWrappedERC20).interfaceId;
        return token.getSupportedInterfaces(interfaceIds);
    }

    /// @notice unsatisfiably determines if contract is ERC20..
    /// @dev it's important to check first whether token is a contract.
    /// @param token address
    function _isERC20(address token) private view returns (bool) {
        (bool success, ) = token.staticcall(
            abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
        );
        return success;
    }
}
