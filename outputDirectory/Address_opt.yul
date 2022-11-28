/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 39:"@openzeppelin/contracts/utils/Address.sol"
object "Address_4602" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("Address_4602_deployed")
            codecopy(_1, dataoffset("Address_4602_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 39:"@openzeppelin/contracts/utils/Address.sol"
    object "Address_4602_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a3646970667358221220b87122d4b6f0a2c8bdc3c2d44592c8666e902e436cfc85261b44677e52fc031c6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
