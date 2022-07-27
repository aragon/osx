// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

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
        address _token = dao.getPluginAddress(
            keccak256(abi.encodePacked(_tokenPlugin.node, _tokenPlugin.semanticVersion))
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
            ERC20VotesUpgradeable(_token)
        );
    }

    function getDependencies() external returns (IDAO.DAOPlugin[] memory) {
        IDAO.DAOPlugin[] memory deps = new IDAO.DAOPlugin[](2);

        uint16[3] memory version;
        version[0] = 1;
        version[1] = 0;
        version[2] = 0;

        deps[0] = IDAO.DAOPlugin(keccak256("minter.aragon.eth"), version); // minter.aragon.eth
        deps[1] = IDAO.DAOPlugin(keccak256("token.aragon.eth"), version); // token.aragon.eth

        return deps;
    }

    function changeVoteConfig(
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration
    ) external auth(MODIFY_VOTE_CONFIG) {
        super.changeVoteConfig(_participationRequiredPct, _supportRequiredPct, _minDuration);
    }

    function execute(uint256 _voteId) public {
        super.execute(dao(), _voteId);
    }
}
