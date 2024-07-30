// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

contract ModifierRoles is Ownable {
    DAO public dao;

    enum Option {
        NONE,
        canFreeze,
        canAddRemove,
        canBoth
    }

    struct Access {
        Option option;
        uint48 since;
        bool isManager;
    }

    struct Role {
        bool isFrozen;
        bool isRegistered;
        mapping(address => Access) members;
    }

    constructor(address _dao) {
        dao = DAO(_dao);
    }

    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes calldata _data
    ) external view returns (bool isPermitted) {
        (, IDAO.Action[] memory actions, ) = abi.decode(data, (bytes32, IDAO.Action[], uint256));

        address[] memory targets = new address[](actions.length);
        bytes4[] memory selectors = new bytes4[](actions.length);

        for (uint i = 0; i < actions.length; i++) {
            targets[i] = actions[i].to;
            selectors = bytes4(actions[i].data[0:4]);
        }

        return dao.isFunctionCallsAllowed(_who, targets, selectors);
    }
}
