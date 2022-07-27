// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

import "../../plugin/aragonPlugin/AragonApp.sol";
import "../MerkleMinter.sol";
import "../MerkleDistributor.sol";

contract WrappedMerkleMinter is AragonApp, MerkleMinter {
    function initialize(address _trustedForwarder, IDAO.DAOPlugin memory _tokenPlugin)
        external
        initializer
    {
        // get dao from the dao slot
        IDAO dao = dao();

        // get dependecy from dao's installed plugins
        address _token = dao.getPluginAddress(
            keccak256(abi.encodePacked(_tokenPlugin.node, _tokenPlugin.semanticVersion))
        );

        token = _token;
        distributorBase = new MerkleDistributor();

        __MerkleMinter_init(
            dao,
            _trustedForwarder,
            IERC20MintableUpgradeable(_token),
            MerkleDistributor(distributorBase)
        );
    }

    function getDependencies() external override returns (Dependency[] memory) {
        Dependency[] memory deps = new Dependency[](1);

        uint16[3] memory version;
        version[0] = 1;
        version[1] = 0;
        version[2] = 0;

        deps[1] = Dependency("token.aragon.eth", version);

        return deps;
    }

    function getPermissions() external override returns (Permissions[] memory) {
        uint16[3] memory version;
        version[0] = 1;
        version[1] = 0;
        version[2] = 0;

        Dependency memory _daoElement = Dependency("", version);
        Dependency memory _tokenPlugin = Dependency("token.aragon.eth", version);
        Dependency memory _merkleMinterPlugin = Dependency("merkleminter.aragon.eth", version);

        Permissions[] memory permissions = new Permissions[](2);
        permissions[0] = Permissions(_tokenPlugin, _merkleMinterPlugin, "MINT_ROLE");
        permissions[1] = Permissions(
            _tokenPlugin,
            _daoElement, // may be if id & version is ("",[0,0,0]), that mean its the dao
            "MINT_ROLE"
        );

        return permissions;
    }
}
