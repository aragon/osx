// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

// This must be non-upgradeable as if it's upgradeable, upgrader can change the code such that it doesn't append msg.sender,
// but some malicious thing and trick SPP.
contract Executor is Executor {
    DAO public dao;

    constructor(address _dao) {
        dao = DAO(_dao);
    }

    // Way 1 - This is the same as `dao.execute`'s code be put here, but this doesn't give any advantage.
    // Permission management won't be checked correctly as PM state in this contract is null, so this will always fail.
    function execute(bytes32 callId, Action[] calldata actions, uint256 allowFailureMap) {
        bytes memory data = abi.encodeCall(
            DAO.execute,
            (callId, actions, allowFailureMap, msg.sender)
        );

        dao.delegatecall(data);
    }

    // Way 2 - This is not gonna work, because whatever code is inside SPP will be executed here
    // and events will be emitted from here instead of SPP.
    function execute(bytes32 callId, Action[] calldata actions, uint256 allowFailureMap) {
        for (uint256 i = 0; i < _actions.length; ) {
            (success, result) = _actions[i].to.delegateCall(actions[i].data);
        }
    }

    // Only this works which means if you also want one of the action to go through dao, you will need
    // nested action. This means that you can't predict `callId` that dao will receive.
    // Decision 1: So for nested actions that go through dao, one must pass `callId = UINT_MAX` in the nested one.
    // If callId is uINT_MAX, this would mean we shouldn't emit the event as caller
    // would emit it. The only downside is if somebody calls `execute` manually and passes that uINT_MAX, we lose the event, but whou
    // would pass UINT_MAX manually ? :) highly unlikely.
    // Decision 2: shall we add `execute` function separately that only expects one action as `bytes memory data` ? this way, in the nested actions,
    // one doesn't need to put another array at all.
    // Way 3 - Since this contract is non-upgradeable, nobody can upgrade this and replace `msg.sender`
    // with malicious sender - i.e this can't trick the reciever ever.
    function _performCall(
        address _to,
        uint256 _value,
        bytes memory _data
    ) internal virtual returns (bool success, bytes memory result) {
        (success, result) = to.call{value: _value}(abi.encodePacked(_data, msg.sender));
    }
}
