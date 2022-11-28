/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 20:"@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol"
object "AddressUpgradeable_6912" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("AddressUpgradeable_6912_deployed")
            codecopy(_1, dataoffset("AddressUpgradeable_6912_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 20:"@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol"
    object "AddressUpgradeable_6912_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a3646970667358221220f2581493bacc43adf507a30ada90da7f95b62cb248ee53e295d110ae5b66138c6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
