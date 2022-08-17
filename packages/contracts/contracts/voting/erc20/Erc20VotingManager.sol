// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

import "../../core/IDAO.sol";
import "../../tokens/GovernanceERC20.sol";
import "../../tokens/GovernanceWrappedERC20.sol";
import "../../plugin/PluginManager.sol";
import "./ERC20Voting.sol";

contract Erc20VotingManager is PluginManager {
    using Address for address;

    /// @notice The logic contract of the `ERC20Voting`.
    ERC20Voting private erc20VotingBase;

    /// @notice The logic contract of the `GovernanceERC20`.
    address public governanceERC20Base;

    /// @notice The logic contract of the `GovernanceWrappedERC20`.
    address public governanceWrappedERC20Base;

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
        governanceERC20Base = address(new GovernanceERC20());
        governanceWrappedERC20Base = address(new GovernanceWrappedERC20());
    }

    /// @inheritdoc PluginManager
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

        bool isGovernanceErc20Token = isGovernanceErc20(_tokenConfig.addr);

        relatedContracts = new address[](!isGovernanceErc20Token ? 1 : 0);

        if (_tokenConfig.addr != address(0) && !isGovernanceErc20Token) {
            // user already has a token. we need to wrap it in
            // GovernanceWrappedERC20 in order to make the token
            // include governance functionality.

            // Validate if token is ERC20
            // Not Enough Checks, but better than nothing.
            _tokenConfig.addr.functionCall(
                abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
            );

            _tokenConfig.addr = createProxy(
                address(_dao),
                governanceWrappedERC20Base,
                abi.encodeWithSelector(
                    GovernanceWrappedERC20.initialize.selector,
                    IERC20Upgradeable(_tokenConfig.addr),
                    _tokenConfig.name,
                    _tokenConfig.symbol
                )
            );

            relatedContracts[0] = _tokenConfig.addr;
        } else if (_tokenConfig.addr == address(0)) {
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

    /// @inheritdoc PluginManager
    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (RequestedPermission[] memory permissions, string[] memory helperNames)
    {
        (, TokenConfig memory _tokenConfig) = abi.decode(data, (VoteConfig, TokenConfig));

        permissions = new RequestedPermission[](!isGovernanceErc20(_tokenConfig.addr) ? 5 : 4);
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

    /// @inheritdoc PluginManager
    function getImplementationAddress() public view virtual override returns (address) {
        return address(erc20VotingBase);
    }

    /// @inheritdoc PluginManager
    function deployABI() external view virtual override returns (string memory) {
        return
            "((tuple(uint64,uint64,uint64) voteConfig),(tuple(address addr,string name,string symbol, (tuple(address[],uint256[]) mintConfig)) tokenConfig))";
    }

    /// @notice Check if a contract address supports `ERC165Upgradeable` interface.
    /// @param _tokenAddress The address of the token contract.
    /// @return bool The boolean to show if the address supports the interface or not.
    function isGovernanceErc20(address _tokenAddress) public view returns (bool) {
        bool isGovernanceErc20Token = ERC165Upgradeable(_tokenAddress).supportsInterface(
            type(ERC20VotesUpgradeable).interfaceId
        );

        return isGovernanceErc20Token;
    }
}
