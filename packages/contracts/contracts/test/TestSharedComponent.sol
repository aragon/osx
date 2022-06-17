// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/Component.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @notice A test component that manages permission to internal objects by associating their IDs with specific DAOs. Only the DAO for which the object was created has the permission to perform ID-gated actions on them.
/// @dev This is realized by asking an `IACLOracle` that must be authorized in the DAO's ACL.
contract TestSharedComponent is Component {
    bytes32 public constant ID_GATED_ACTION_ROLE = keccak256("ID_GATED_ACTION_ROLE");

    mapping(uint256 => IDAO) public ownedIds;

    uint256 internal _counter;

    error ObjectIdNotAssigned(uint256 _id);

    modifier sharedAuth(uint256 _id, bytes32 _role) {
        if (_id > _counter) {
            revert ObjectIdNotAssigned(_id);
        }

        if (!ownedIds[_id].hasPermission(address(this), _msgSender(), _role, _msgData())) {
            revert ACLData.ACLAuth({
                here: address(this),
                where: address(this),
                who: _msgSender(),
                role: _role
            });
        }

        _;
    }

    function initialize(IDAO _dao) external initializer {
        __Component_init(_dao);
    }

    /// @notice Creates a new object with an ID being associated with a specific DAO
    /// @param _dao The DAO that manages permissions for the object
    /// @return id The ID that is associated with the object and the DAO
    function createNewObject(IDAO _dao) external returns (uint256 id) {
        id = _counter;
        ownedIds[id] = _dao;
        _counter++;
    }

    /// @notice Executes something if the `id` parameter is authorized by the DAO associated through `ownedIds`. This is done by asking an `IACLOracle` that must be authorized in the DAO's ACL via `grantWithoracle` and the `ID_GATED_ACTION_ROLE`.
    /// @param _id The ID that is  associated with a specific DAO
    function idGatedAction(uint256 _id) external sharedAuth(_id, ID_GATED_ACTION_ROLE) {
        // do something
    }
}

/// @notice The oracle associated with `TestSharedComponent`
contract TestIdGatingOracle is IACLOracle {
    uint256 public allowedId;

    constructor(uint256 _id) {
        allowedId = _id;
    }

    /// @notice Checks the calldata and expects the `id` to be the first argument of type `uint256`

    function willPerform(
        address _where,
        address _who,
        bytes32 _role,
        bytes calldata _data
    ) external view returns (bool) {
        (_where, _who, _role);

        // Security issue? Can the method be wrapped?

        // Skip the signature (the first 4 bytes) and decode the first parameter as a `uint256`
        uint256 id = abi.decode(_data[4:], (uint256));

        // let perform if the id match
        return id == allowedId;
    }
}
