/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 47:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/CallbackHandler.sol"
object "CallbackHandler_4840" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("CallbackHandler_4840_deployed")
            codecopy(_1, dataoffset("CallbackHandler_4840_deployed"), _2)
            return(_1, _2)
        }
    }
    /// @use-src 47:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/CallbackHandler.sol"
    object "CallbackHandler_4840_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a364697066735822122012b390bdfe31656713d89cef6b94cd998133ab3c31381a9844d2b77bffa6e7356c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
