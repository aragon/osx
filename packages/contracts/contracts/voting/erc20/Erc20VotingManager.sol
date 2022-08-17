// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../core/IDAO.sol";
import "../../core/DAO.sol";
import "../../tokens/GovernanceERC20.sol";
import "../../tokens/GovernanceWrappedERC20.sol";
import "../../tokens/MerkleMinter.sol";
import "../../tokens/MerkleDistributor.sol";
import "./ERC20Voting.sol";
import "../../plugin/PluginManager.sol";

contract Erc20VotingManager is PluginManager {
    ERC20Voting private erc20VotingBase;

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
        GovernanceERC20.MintConfig mintConfig;
    }

    struct VoteConfig {
        uint64 participationRequiredPct;
        uint64 supportRequiredPct;
        uint64 minDuration;
    }

    constructor() {
        erc20VotingBase = new ERC20Voting();
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

        (VoteConfig memory _voteConfig, TokenConfig memory _tokenConfig) = abi.decode(
            data,
            (VoteConfig, TokenConfig)
        );

        relatedContracts = new address[](_tokenConfig.addr == address(0) ? 1 : 0);

        if (_tokenConfig.addr == address(0)) {
            // Create `GovernanceERC20`
            _tokenConfig.addr = createProxy(
                address(_dao),
                governanceERC20Base,
                abi.encodeWithSelector(
                    GovernanceERC20.initialize.selector,
                    _tokenConfig.name,
                    _tokenConfig.symbol
                )
            );

            relatedContracts[0] = _tokenConfig.addr;
        } else {
            // check token address interface
            // TODO
            // if not comply then
            // revert()
        }

        bytes memory init = abi.encodeWithSelector(
            ERC20Voting.initialize.selector,
            _dao,
            _dao.getTrustedForwarder(),
            _voteConfig.participationRequiredPct,
            _voteConfig.supportRequiredPct,
            _voteConfig.minDuration,
            GovernanceERC20(_tokenConfig.addr)
        );

        plugin = createProxy(dao, getImplementationAddress(), init);
    }

    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (RequestedPermission[] memory permissions, string[] memory helperNames)
    {
        (, TokenConfig memory _tokenConfig) = abi.decode(data, (VoteConfig, TokenConfig));

        permissions = new RequestedPermission[](_tokenConfig.addr == address(0) ? 5 : 4);
        helperNames = new string[](1);

        address NO_ORACLE = address(0);

        // Allows plugin to call DAO with EXEC_PERMISSION
        permissions[0] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        // Allows DAO to call plugin with SET_CONFIGURATION_PERMISSION
        permissions[1] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            erc20VotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        // Allows DAO to call plugin with UPGRADE_PERMISSION
        permissions[2] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            erc20VotingBase.UPGRADE_PERMISSION_ID()
        );

        // Allows DAO to call plugin with SET_TRUSTED_FORWARDER_PERMISSION
        permissions[3] = buildPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            erc20VotingBase.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        uint256 GOVERNANCE_ERC20_HELPER_IDX = 0;

        if (_tokenConfig.addr == address(0)) {
            // Allows DAO to call relatedContracts (token) with MINT_PERMISSION.
            permissions[4] = buildPermission(
                BulkPermissionsLib.Operation.Grant,
                GOVERNANCE_ERC20_HELPER_IDX,
                DAO_PLACEHOLDER,
                NO_ORACLE,
                keccak256("MINT_PERMISSION")
            );
        }

        helperNames[GOVERNANCE_ERC20_HELPER_IDX] = "GovernanceERC20";
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(erc20VotingBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return
            "((tuple(uint64,uint64,uint64) voteConfig),(tuple(address addr,string name,string symbol, (tuple(address[],uint256[]) mintConfig)) tokenConfig))";
    }
}
