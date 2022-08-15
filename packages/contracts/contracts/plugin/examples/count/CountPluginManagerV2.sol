// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

import "../../PluginManager.sol";
import "./MultiplyHelper.sol";
import "./CountV2.sol";

contract CountPluginManagerV1 is PluginManager {
    MultiplyHelper public multiplyHelperBase;
    CountV2 public countBase;

    // MultiplyHelper doesn't change. so dev decides to pass the old one.
    constructor(MultiplyHelper _helper) {
        multiplyHelperBase = _helper;
        countBase = new CountV2();
    }

    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (bytes memory init, address[] memory relatedContracts)
    {   
        // This changes as in V2, initialize now expects 3 arguments..
        (address _multiplyHelper, uint256 _num, uint256 _newVariable) = abi.decode(
            data,
            (address, uint256, uint256)
        );

        relatedContracts = new address[](1);

        if (_multiplyHelper == address(0)) {
            _multiplyHelper = createProxy(dao, address(multiplyHelperBase), "0x");
        }

        init = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,uint256)")),
            _multiplyHelper,
            _num,
            _newVariable
        );

        relatedContracts[0] = _multiplyHelper;
    }

    function update(
        uint16[3] calldata oldVersion,
        uint16[3] calldata newVersion,
        bytes memory updateInitData,
        bytes memory data
    ) external virtual override returns (bytes memory init, address[] memory relatedContracts) {
        init = abi.encodeWithSelector(bytes4(keccak256("update(uint)")), updateInitData);
    }

    // TODO: WOULD THIS NEED dao as well to be passed
    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (Permission[] memory permissions, string[] memory helperNames)
    {
        address _multiplyHelper = abi.decode(data, (address));

        permissions = new Permission[](_multiplyHelper == address(0) ? 2 : 3);
        helperNames = new string[](1);

        // Allows plugin Count to call execute on DAO
        permissions[0] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            address(0),
            keccak256("EXEC_PERMISSION")
        );

        // Allows DAO to call Multiply on plugin Count
        permissions[1] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            countBase.MULTIPLY_PERMISSION_ID()
        );

        // MultiplyHelper could be something that dev already has it from outside
        // which mightn't be a aragon plugin. It's dev's responsibility to do checks
        // and risk whether or not to still set the permission.
        if (_multiplyHelper == address(0)) {
            // Allows Count plugin to call MultiplyHelper's multiply function.
            permissions[2] = createPermission(
                BulkPermissionsLib.Operation.Grant,
                0, // Index from relatedContracts (multiplyHelper)
                PLUGIN_PLACEHOLDER,
                address(0),
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        helperNames[0] = "MultiplyHelper";
    }

    function getUpdatePermissions(
        uint16[3] calldata oldVersion,
        uint16[3] calldata newVersion,
        bytes memory updateInitData,
        bytes memory data
    )
        external
        view
        virtual
        override
        returns (
            Permission[] memory permissions,
            string[] memory /* helperNames */
        )
    {
        address whoCanCallMultiply = abi.decode(data, (address));

        permissions = new Permission[](2);

        // Now, revoke permission so dao can't call anymore this multiply function on plugin.
        permissions[0] = createPermission(
            BulkPermissionsLib.Operation.Revoke,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            countBase.MULTIPLY_PERMISSION_ID()
        );

        // ALLOW Some 3rd party to be able to call multiply on plugin after update.
        permissions[1] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            whoCanCallMultiply,
            address(0),
            countBase.MULTIPLY_PERMISSION_ID()
        );
    }

    function getBaseAddress() external view virtual override returns (address) {
        return address(countBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
    }

    // With this approach, dev can anytime overwrite
    function updateInitABI(uint16[3] calldata oldVersion, uint16[3] calldata newVersion)
        external
        view
        virtual
        override
        returns (string memory)
    {

        return "(uint _newVariable)";
    }

    function updateABI() external view virtual override returns (string memory) {
        return "(address whoCanCallMultiply)";
    }
}
