// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

contract ModifierRoles is Ownable {
    DAO public dao;

    constructor(address _dao) {
        dao = DAO(_dao);
    }

    function execute(bytes32 callId, Action[] calldata actions, uint256 allowFailureMap) {
        for (uint256 i = 0; i < _actions.length; ) {
            bytes32 id = keccak256(bytes4(actions[i].data));
            address target = actions[i].to;

            bool kk = dao.isFunctionCallsAllowed(actions);
            if (!kk) {
                revert;
            }
        }

        dao.delegatecall(execute, [callId, actions, allowFailureMap]);
    }
}
