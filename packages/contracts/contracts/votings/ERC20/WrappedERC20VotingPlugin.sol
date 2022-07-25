// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../../plugin/aragonPlugin/AragonApp.sol";
import "./ERC20Voting.sol";

contract WrappedERC20VotingPlugin is AragonApp, ERC20Voting {
    function initialize(
        address _gsnForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration,
        IDAO.DAOPlugin memory _tokenPlugin
    ) public initializer {
        // get dao from the dao slot
        IDAO dao = dao();

        // get dependecy from dao's installed plugins
        address _token = dao.installedPlugins(
            keccak256(
                abi.encodePacked(
                    _tokenPlugin.node,
                    _tokenPlugin.semanticVersion,
                    _tokenPlugin.count
                )
            )
        );

        // check if token or it's version is valid,
        // or any other related thing that is important for this plugin is valid

        // require(checkTokenDep(), "token not valid");

        __ERC20Voting_init(
            dao,
            _gsnForwarder,
            _participationRequiredPct,
            _supportRequiredPct,
            _minDuration,
            _token
        );
    }

    function getDependencies() external returns (IDAO.DAOPlugin[] memory) {
        IDAO.DAOPlugin[] memory deps = IDAO.DAOPlugin[](2);

        deps[0] = IDAO.DAOPlugin(
            "0x746f6b656e2e617261676f6e2e657468000000000000000000000000000000",
            [1, 0, 0]
        ); // minter.aragon.eth
        deps[1] = IDAO.DAOPlugin(
            "0x6572633230766f74696e672e617261676f6e2e657468000000000000000000",
            [1, 0, 0]
        ); // token.aragon.eth

        return deps;
    }
}
