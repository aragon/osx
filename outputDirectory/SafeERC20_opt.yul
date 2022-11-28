/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 38:"@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"
object "SafeERC20_4307" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("SafeERC20_4307_deployed")
            codecopy(_1, dataoffset("SafeERC20_4307_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 38:"@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"
    object "SafeERC20_4307_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a3646970667358221220148522a7f017dcf8b353a053adb122f0d008991b3220b41be0c0111af379caa96c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
