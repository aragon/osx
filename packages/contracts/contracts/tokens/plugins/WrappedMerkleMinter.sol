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

    function getDependencies() external override returns (IDAO.DAOPlugin[] memory) {
        IDAO.DAOPlugin[] memory deps = new IDAO.DAOPlugin[](1);

        uint16[3] memory version;
        version[0] = 1;
        version[1] = 0;
        version[2] = 0;

        deps[1] = IDAO.DAOPlugin(keccak256("token.aragon.eth"), version); // token.aragon.eth

        return deps;
    }

    function getPermissions() external override returns (Permissions[]) {
        uint16[3] memory version;
        version[0] = 1;
        version[1] = 0;
        version[2] = 0;

        IDAO.DAOPlugin _tokenPlugin = IDAO.DAOPlugin(keccak256("token.aragon.eth"), version);

        address _token = IDAO(dao()).getPluginAddress(
            keccak256(abi.encodePacked(_tokenPlugin.node, _tokenPlugin.semanticVersion))
        );

        Permissions[] permissions = new Permissions[](2);
        permissions[0] = Permissions(_token, address(this), "MINT_ROLE");
        permissions[1] = Permissions(
            _token,
            dao(), // on implementation this address will be zero, it change to dao once deployed
            "MINT_ROLE"
        );
    }

    // option 2
    function getPermissions2() external override returns (Permissions[]) {
        uint16[3] memory version;
        version[0] = 1;
        version[1] = 0;
        version[2] = 0;

        IDAO.DAOPlugin _tokenPlugin = IDAO.DAOPlugin(keccak256("token.aragon.eth"), version);
        IDAO.DAOPlugin _merkleMinterPlugin = IDAO.DAOPlugin(
            keccak256("merkleminter.aragon.eth"),
            version
        );

        Permissions[] permissions = new Permissions[](2);
        permissions[0] = Permissions(_tokenPlugin, _merkleMinterPlugin, "MINT_ROLE");
        permissions[1] = Permissions(
            _token,
            dao(), // on implementation this address will be zero, it change to dao once deployed
            "MINT_ROLE"
        );
    }
}
