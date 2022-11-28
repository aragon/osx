/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 43:"@openzeppelin/contracts/utils/introspection/ERC165Checker.sol"
object "ERC165Checker_1419" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("ERC165Checker_1419_deployed")
            codecopy(_1, dataoffset("ERC165Checker_1419_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 43:"@openzeppelin/contracts/utils/introspection/ERC165Checker.sol"
    object "ERC165Checker_1419_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a36469706673582212208590d4b3da08187cb7532304b99260e224cab4c271db8d3fcc61456a9bc2e6ee6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
