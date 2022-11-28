/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 53:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionLib.sol"
object "PermissionLib_2104" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("PermissionLib_2104_deployed")
            codecopy(_1, dataoffset("PermissionLib_2104_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 53:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionLib.sol"
    object "PermissionLib_2104_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a3646970667358221220fd283c3a7c5cebf26943d037c06c83359ce07b475b15816040aafa6082308dbb6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
