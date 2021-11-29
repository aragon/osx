/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../../lib/permissions/PermissionValidator.sol";
import "../DAO.sol";
import "../proxy/Component.sol";

// TODO: Add update, remove etc. role
/// @title The permissions contract responsible to handle all the governance process related permissions.
/// @author Samuel Furter - Aragon Association - 2021
/// @notice This contract is a central point of the Aragon DAO framework and handles all the permissions and stores the different groups a DAO can have.
contract Permissions is UpgradableComponent {
    
    bytes32 public constant PERMISSIONS_SET_ROLE = keccak256("PERMISSIONS_SET_ROLE");

    event NewRoleAdded(string indexed role, Permission indexed permission);

    // The operator used to combine the validators accordingly to the the users wish
    enum Operator { 
        OR, 
        AND,
        NAND,
        NOR
    }
   
    // A permission consists out of a logical operator that defines how the set of validators should get interpreted
    struct Permission {
        Operator operator;
        PermissionValidator[] validators; // ERC20Validator, NFTValidator
        bytes[] data;
    }

    // The different permissions to define depending on the type of governance primitive
    struct GovernancePrimitivePermissions {
        string start;
        string execute;
        string halt;
        string forward;
        string stop;
        string vote;
    }

    mapping(string => Permission) public permissions;

    constructor() initializer {}

    /// @dev Used for UUPS upgradability pattern
    /// @param _dao The DAO contract of the current DAO
    function initialize(DAO _dao) public override initializer {
        Component.initialize(_dao);
    }

    /// @notice Adds a new role based on the permission validations passed.
    /// @dev Here you simple pass the role name and the permission struct with his logical operator and the validators set.
    /// @param role The name of the role as string
    /// @param permission The permission struct to define the permission validation rules
    function setRole(string calldata role, Permission calldata permission) external authP(PERMISSIONS_SET_ROLE) {
        permissions[role] = permission; // Group1 => [AND, ERC20Validator]

        emit NewRoleAdded(role, permission);
    }

    // TODO: This method is not gas efficient
    /// @notice Checks the permissions of the caller.
    /// @dev Based on the stored permission struct does it go through all validators and checks the validity of the caller.
    /// @param role The name of the role as string
    /// @return valid The validity check result returned as bool
    function checkPermission(string calldata role) external view returns (bool valid) {
        PermissionValidator[] memory validators = permissions[role].validators;
        Operator operator = permissions[role].operator;
        bytes[] memory data = permissions[role].data;

        uint256 validatorsLength = validators.length;
        uint8 succeeds = 0;

        for (uint256 i = 0; i < validatorsLength; i++) {
            PermissionValidator validator = validators[i];
            if(PermissionValidator(validator).isValid(msg.sender, data[i])) {
                succeeds += 1;
            }
        }

        if(operator == Operator.AND && succeeds == validatorsLength) {
            return true;
        }

        if(operator == Operator.OR && succeeds >= 1) {
            return true;
        }

        if(operator == Operator.NAND && succeeds < validatorsLength) {
            return true;
        }

        if(operator == Operator.NOR && succeeds == 0) {
           return true;
        }

        return false;
    }
}
