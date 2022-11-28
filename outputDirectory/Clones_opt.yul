/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 28:"@openzeppelin/contracts/proxy/Clones.sol"
object "Clones_6167" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("Clones_6167_deployed")
            codecopy(_1, dataoffset("Clones_6167_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 28:"@openzeppelin/contracts/proxy/Clones.sol"
    object "Clones_6167_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a3646970667358221220c2d17b7e6bf8f7c7fda00596bc6878a51f6d327eed05d332e1e0fee2b4867c766c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
