/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 41:"@openzeppelin/contracts/utils/StorageSlot.sol"
object "StorageSlot_8428" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("StorageSlot_8428_deployed")
            codecopy(_1, dataoffset("StorageSlot_8428_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 41:"@openzeppelin/contracts/utils/StorageSlot.sol"
    object "StorageSlot_8428_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a3646970667358221220762b6fc6d543dea9b6d6274503d828a50aeae511abdf8d750c78c8a3f83fde986c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
