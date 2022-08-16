// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../core/IDAO.sol";
import "../tokens/GovernanceERC20.sol";
import "../tokens/GovernanceWrappedERC20.sol";
import "../tokens/MerkleMinter.sol";
import "../tokens/MerkleDistributor.sol";
import "./Erc20Voting.sol";
import "../../plugin/PluginManager.sol";

contract Erc20VotingManager is PluginManager {
    Erc20Voting private erc20VotingBase;

    /// @notice The address of the `GovernanceERC20` base contract to clone from.
    address public governanceERC20Base;

    /// @notice The address of the `GovernanceWrappedERC20` base contract to clone from.
    address public governanceWrappedERC20Base;

    /// @notice The address of the `MerkleMinter` base contract to clone from.
    address public merkleMinterBase;

    /// @notice The `MerkleDistributor` base contract used to initialize the `MerkleMinter` clones.
    MerkleDistributor public distributorBase;

    struct TokenConfig {
        address addr;
        string name;
        string symbol;
    }

    struct MintConfig {
        address[] receivers;
        uint256[] amounts;
    }

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor() {
        erc20VotingBase = new Erc20Voting();
        distributorBase = new MerkleDistributor();
        governanceERC20Base = address(new GovernanceERC20());
        governanceWrappedERC20Base = address(new GovernanceWrappedERC20());
        merkleMinterBase = address(new MerkleMinter());
    }

    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (address plugin, address[] memory relatedContracts)
    {
        IDAO _dao = IDAO(payable(dao));

        (
            VoteConfig memory _voteConfig,
            TokenFactory.TokenConfig memory _tokenConfig,
            TokenFactory.MintConfig memory _mintConfig
        ) = abi.decode(params, (VoteConfig, TokenFactory.TokenConfig, TokenFactory.MintConfig));

        relatedContracts = new address[](_tokenConfig.addr == address(0) ? 2 : 0);

        if (_tokenConfig.addr == address(0)) {
            // Create `GovernanceERC20`
            _tokenConfig.addr = createProxy(
                _dao,
                governanceERC20Base,
                abi.encodeWithSelector(
                    GovernanceERC20.initialize.selector,
                    _tokenConfig.name,
                    _tokenConfig.symbol
                )
            );

            relatedContracts[0] = _tokenConfig.addr;

            // Create `MerkleMinter`
            address merkleMinter = createProxy(
                _dao,
                merkleMinterBase,
                abi.encodeWithSelector(
                    MerkleMinter.initialize.selector,
                    _dao,
                    _dao.getTrustedForwarder(),
                    IERC20MintableUpgradeable(_tokenConfig.addr),
                    distributorBase
                )
            );

            relatedContracts[1] = merkleMinter;

            // TODO: Problem:
            // we can not mint any token here
            // because we don't have permission to mint yet
            // as of now we don't have a way to call functions that have auth on them
            // as discussed we might need a solution for this, such as postHook()
        } else {
            // check token address interface
            // TODO
            // if not comply then
            // revert()
        }

        bytes memory init = abi.encodeWithSelector(
            Erc20Voting.initialize.selector,
            _dao,
            _dao.trustedForwarder(),
            _voteConfig.participationRequiredPct,
            _voteConfig.supportRequiredPct,
            _voteConfig.minDuration,
            token
        );

        plugin = createProxy(dao, getImplementationAddress(), init);
    }

    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (Permission[] memory permissions, string[] memory helperNames)
    {
        (, TokenFactory.TokenConfig memory _tokenConfig, ) = abi.decode(
            params,
            (VoteConfig, TokenFactory.TokenConfig, TokenFactory.MintConfig)
        );

        permissions = new Permission[](_tokenConfig.addr == address(0) ? 7 : 4);

        // Allows plugin to call DAO with EXEC_PERMISSION
        permissions[0] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        // Allows DAO to call plugin with SET_CONFIGURATION_PERMISSION
        permissions[1] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            erc20VotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        // Allows DAO to call plugin with UPGRADE_PERMISSION
        permissions[2] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            erc20VotingBase.UPGRADE_PERMISSION_ID()
        );

        // Allows DAO to call plugin with SET_TRUSTED_FORWARDER_PERMISSION
        permissions[3] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            erc20VotingBase.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        if (_tokenConfig.addr == address(0)) {
            // Allows DAO to call relatedContracts (token) with MINT_PERMISSION.
            permissions[4] = createPermission(
                BulkPermissionsLib.Operation.Grant,
                0, // Index from relatedContracts (token)
                DAO_PLACEHOLDER,
                NO_ORACLE,
                GovernanceERC20.MINT_PERMISSION_ID()
            );

            // Allows relatedContracts (merkleMinter) to call relatedContracts (token) with MINT_PERMISSION.
            permissions[5] = createPermission(
                BulkPermissionsLib.Operation.Grant,
                1, // Index from relatedContracts (merkleMinter)
                0, // Index from relatedContracts (token)
                NO_ORACLE,
                GovernanceERC20.MINT_PERMISSION_ID()
            );

            // Allows DAO to call relatedContracts (merkleMinter) with MERKLE_MINT_PERMISSION.
            permissions[6] = createPermission(
                BulkPermissionsLib.Operation.Grant,
                1, // Index from relatedContracts (merkleMinter)
                DAO_PLACEHOLDER,
                NO_ORACLE,
                MerkleMinter.MERKLE_MINT_PERMISSION_ID()
            );
        }
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(erc20VotingBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "((uint64,uint64,uint64),(address,string,string),(address[],uint256[]))";
    }
}
