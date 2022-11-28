/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 22:"@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol"
object "StorageSlotUpgradeable_8358" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("StorageSlotUpgradeable_8358_deployed")
            codecopy(_1, dataoffset("StorageSlotUpgradeable_8358_deployed"), _2)
            setimmutable(_1, "library_deploy_address", address())
            return(_1, _2)
        }
    }
    /// @use-src 22:"@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol"
    object "StorageSlotUpgradeable_8358_deployed" {
        code {
            {
                mstore(64, memoryguard(0x80))
                revert(0, 0)
            }
        }
        data ".metadata" hex"a36469706673582212202b0c144b605241536542228f0dfce55a4e890728fc94e3e7ba5adea102dddbda6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
