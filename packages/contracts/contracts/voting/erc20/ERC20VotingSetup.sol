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
import {ERC20Voting} from "./ERC20Voting.sol";

/// @title AllowlistVotingSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `ERC20Voting` plugin.
contract ERC20VotingSetup is PluginSetup {
    using Address for address;
    using Clones for address;
    using ERC165Checker for address;

    /// @notice The address of the `ERC20Voting` base contract.
    ERC20Voting private immutable erc20VotingBase;

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

    struct MintSettings {
        address[] receivers;
        uint256[] amounts;
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
        governanceERC20Base = address(new GovernanceERC20(IDAO(address(0)), "", ""));
        governanceWrappedERC20Base = address(
            new GovernanceWrappedERC20(IERC20Upgradeable(address(0)), "", "")
        );
        merkleMinterBase = address(new MerkleMinter());
        erc20VotingBase = new ERC20Voting();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return
            "(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration, tuple(address addr, string name, string symbol) tokenSettings, tuple(address[] receivers, address[] amounts) mintSettings)";
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory _data)
        external
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        IDAO dao = IDAO(_dao);

        // Decode `_data` to extract the params needed for deploying and initializing `ERC20Voting` plugin,
        // and the required helpers
        (
            uint64 participationRequiredPct,
            uint64 supportRequiredPct,
            uint64 minDuration,
            TokenSettings memory tokenSettings,
            MintSettings memory mintSettings
        ) = abi.decode(_data, (uint64, uint64, uint64, TokenSettings, MintSettings));

        // Check mint setting.
        if (mintSettings.receivers.length != mintSettings.amounts.length) {
            revert MintArrayLengthMismatch({
                receiversArrayLength: mintSettings.receivers.length,
                amountsArrayLength: mintSettings.amounts.length
            });
        }

        address token = tokenSettings.addr;

        // Prepare helpers.
        helpers = new address[](token != address(0) ? 1 : 2);

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
                    IERC20Upgradeable(token),
                    tokenSettings.name,
                    tokenSettings.symbol
                );
            }

            helpers[0] = token;
        } else {
            // Clone a `GovernanceERC20`.
            token = governanceERC20Base.clone();
            GovernanceERC20(token).initialize(dao, tokenSettings.name, tokenSettings.symbol);

            // Create a `MerkleMinter`.
            address merkleMinter = createERC1967Proxy(
                address(merkleMinterBase),
                abi.encodeWithSelector(
                    MerkleMinter.initialize.selector,
                    dao,
                    IERC20MintableUpgradeable(token),
                    distributorBase
                )
            );

            helpers[0] = token;
            helpers[1] = merkleMinter;
        }

        // Prepare and deploy plugin proxy.
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
        permissions = new PermissionLib.ItemMultiTarget[](tokenSettings.addr != address(0) ? 3 : 7);

        // Set plugin permissions to be granted.
        // Grant the list of prmissions of the plugin to the DAO.
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

            permissions[4] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                token,
                helpers[1], // merkleMinter
                NO_ORACLE,
                tokenMintPermission
            );

            permissions[5] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                helpers[1], // merkleMinter
                _dao,
                NO_ORACLE,
                MerkleMinter(helpers[1]).MERKLE_MINT_PERMISSION_ID()
            );

            permissions[6] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                helpers[1], // merkleMinter
                _dao,
                NO_ORACLE,
                MerkleMinter(helpers[1]).UPGRADE_PERMISSION_ID()
            );
        }
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external pure returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _helpers,
        bytes calldata
    ) external view returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        // Prepare permissions.
        uint256 helperLength = _helpers.length;
        if (helperLength == 1) {
            permissions = new PermissionLib.ItemMultiTarget[](3);
        } else if (helperLength == 2) {
            permissions = new PermissionLib.ItemMultiTarget[](7);
        } else {
            revert WrongHelpersArrayLength({length: helperLength});
        }

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            erc20VotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            erc20VotingBase.UPGRADE_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );

        if (helperLength == 2) {
            address token = _helpers[0];
            address merkleMinter = _helpers[1];

            bytes32 tokenMintPermission = GovernanceERC20(token).MINT_PERMISSION_ID();

            permissions[3] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                token,
                _dao,
                NO_ORACLE,
                tokenMintPermission
            );

            permissions[4] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                token,
                merkleMinter,
                NO_ORACLE,
                tokenMintPermission
            );

            permissions[5] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                merkleMinter,
                _dao,
                NO_ORACLE,
                MerkleMinter(merkleMinter).MERKLE_MINT_PERMISSION_ID()
            );

            permissions[6] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                merkleMinter,
                _dao,
                NO_ORACLE,
                MerkleMinter(merkleMinter).UPGRADE_PERMISSION_ID()
            );
        }
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view virtual override returns (address) {
        return address(erc20VotingBase);
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
