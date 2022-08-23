// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
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
    using ERC165Checker for address;

    address private constant NO_ORACLE = address(0);

    /// @notice The logic contract of the `ERC20Voting`.
    ERC20Voting private erc20VotingBase;

    /// @notice The logic contract of the `GovernanceERC20`.
    address public governanceERC20Base;

    /// @notice The logic contract of the `GovernanceWrappedERC20`.
    address public governanceWrappedERC20Base;

    struct TokenSetting {
        address addr;
        string name;
        string symbol;
        GovernanceERC20.MintSetting mintSetting;
    }

    struct VoteSetting {
        uint64 minTurnout;
        uint64 minSupport;
        uint64 minDuration;
    }

    constructor() {
        erc20VotingBase = new ERC20Voting();
        governanceERC20Base = address(new GovernanceERC20());
        governanceWrappedERC20Base = address(new GovernanceWrappedERC20());
    }

    /// @inheritdoc PluginManager
    function deploy(address dao, bytes memory data)
        public
        virtual
        override
        returns (address plugin, Permission.ItemMultiTarget[] memory permissions)
    {
        IDAO _dao = IDAO(payable(dao));

        // Decode the passed parameters.
        (VoteSetting memory _voteSetting, TokenSetting memory _tokenSetting) = abi.decode(
            data,
            (VoteSetting, TokenSetting)
        );

        // check if the token address is already a `GovernanceERC20` or `GovernanceWrappedERC20` or not.
        (bool isGovernanceErc20, bool isGovernanceErc20Wrapped) = isGovernanceToken(
            _tokenSetting.addr
        );

        permissions = new Permission.ItemMultiTarget[](_tokenSetting.addr == address(0) ? 5 : 4);

        if (_tokenSetting.addr == address(0)) {
            // Create `GovernanceERC20`
            _tokenSetting.addr = createProxy(
                address(_dao),
                governanceERC20Base,
                abi.encodeWithSelector(
                    GovernanceERC20.initialize.selector,
                    address(_dao),
                    _tokenSetting.name,
                    _tokenSetting.symbol,
                    _tokenSetting.mintSetting
                )
            );
        } else if (!isGovernanceErc20 && !isGovernanceErc20Wrapped) {
            // user already has a token. we need to wrap it in
            // GovernanceWrappedERC20 in order to make the token
            // include governance functionality.

            // Validate if token is ERC20
            // Not Enough Checks, but better than nothing.
            _tokenSetting.addr.functionCall(
                abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
            );

            _tokenSetting.addr = createProxy(
                address(_dao),
                governanceWrappedERC20Base,
                abi.encodeWithSelector(
                    GovernanceWrappedERC20.initialize.selector,
                    IERC20Upgradeable(_tokenSetting.addr),
                    _tokenSetting.name,
                    _tokenSetting.symbol
                )
            );
        }

        // Encode the parameters that will be passed to `initialize()` on the Plugin
        bytes memory initData = abi.encodeWithSelector(
            ERC20Voting.initialize.selector,
            _dao,
            _dao.getTrustedForwarder(),
            _voteSetting.minTurnout,
            _voteSetting.minSupport,
            _voteSetting.minDuration,
            GovernanceERC20(_tokenSetting.addr)
        );

        // Deploy the Plugin itself as a proxy, make it point to the implementation logic
        // and pass the initialization parameteres.
        plugin = createProxy(dao, getImplementationAddress(), initData);

        // permission preperations
        //
        bytes32 tokenMintPermission = GovernanceERC20(governanceERC20Base).MINT_PERMISSION_ID();

        // Grant the `EXECUTE_PERMISSION_ID` permission of the installing DAO to the plugin.
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        // Grant the `SET_CONFIGURATION_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            erc20VotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        // Grant the `UPGRADE_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[2] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            erc20VotingBase.UPGRADE_PERMISSION_ID()
        );

        // Grant the `SET_TRUSTED_FORWARDER_PERMISSION_ID` permission of the plugin to the installing DAO.
        permissions[3] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            erc20VotingBase.SET_TRUSTED_FORWARDER_PERMISSION_ID()
        );

        if (_tokenSetting.addr == address(0)) {
            // Grant the `MINT_PERMISSION_ID` permission of the`GovernanceErc20` helper contract to the installing DAO.
            permissions[4] = Permission.ItemMultiTarget(
                Permission.Operation.Grant,
                _tokenSetting.addr,
                dao,
                NO_ORACLE,
                tokenMintPermission
            );
        }
    }

    /// @inheritdoc PluginManager
    function getImplementationAddress() public view virtual override returns (address) {
        return address(erc20VotingBase);
    }

    /// @inheritdoc PluginManager
    function deployABI() external view virtual override returns (string memory) {
        return
            "((tuple(uint64 minTurnout, uint64 minSupport, uint64 minDuration) voteSetting),(tuple(address addr,string name,string symbol, (tuple(address[] receivers,uint256[] amounts) mintSetting)) tokenSetting))";
    }

    /// @notice Check if a contract address supports `ERC165Upgradeable` interface.
    /// @param _tokenAddress The address of the token contract.
    /// @return isGovernanceErc20 The boolean to show if the address supports the interface or not.
    /// @return isGovernanceErc20Wrapped The boolean to show if the address supports the interface or not.
    function isGovernanceToken(address _tokenAddress)
        public
        view
        returns (bool isGovernanceErc20, bool isGovernanceErc20Wrapped)
    {
        isGovernanceErc20 = _tokenAddress.supportsInterface(
            type(ERC20VotesUpgradeable).interfaceId
        );

        isGovernanceErc20Wrapped = _tokenAddress.supportsInterface(
            type(ERC20WrapperUpgradeable).interfaceId
        );
    }
}
