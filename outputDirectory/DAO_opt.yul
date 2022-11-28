/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 15:"@openzeppelin/contracts-upgradeable/interfaces/draft-IERC1822Upgradeable.sol", 16:"@openzeppelin/contracts-upgradeable/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol", 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 19:"@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol", 23:"@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol", 24:"@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol", 25:"@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol", 26:"@openzeppelin/contracts/interfaces/IERC1271.sol", 45:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/DAO.sol", 46:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/IDAO.sol", 47:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/CallbackHandler.sol", 54:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionManager.sol"
object "DAO_2053" {
    code {
        {
            let _1 := memoryguard(0xa0)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            mstore(128, address())
            let _2 := datasize("DAO_2053_deployed")
            codecopy(_1, dataoffset("DAO_2053_deployed"), _2)
            setimmutable(_1, "3250", mload(128))
            return(_1, _2)
        }
    }
    /// @use-src 16:"@openzeppelin/contracts-upgradeable/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol", 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 19:"@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol", 20:"@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol", 22:"@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol", 23:"@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol", 24:"@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol", 38:"@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol", 39:"@openzeppelin/contracts/utils/Address.sol", 45:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/DAO.sol", 47:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/CallbackHandler.sol", 54:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionManager.sol"
    object "DAO_2053_deployed" {
        code {
            {
                let _1 := 64
                mstore(_1, 128)
                if iszero(lt(calldatasize(), 4))
                {
                    let _2 := 0
                    switch shr(224, calldataload(_2))
                    case 0x01ffc9a7 {
                        if callvalue() { revert(_2, _2) }
                        let ret := fun_supportsInterface(abi_decode_bytes4(calldatasize()))
                        let memPos := mload(_1)
                        return(memPos, sub(abi_encode_bool(memPos, ret), memPos))
                    }
                    case 0x0729d054 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_1 := mload(_1)
                        return(memPos_1, sub(abi_encode_bytes32_10594(memPos_1), memPos_1))
                    }
                    case 0x09e56b14 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_2 := mload(_1)
                        return(memPos_2, sub(abi_encode_bytes32_10596(memPos_2), memPos_2))
                    }
                    case 0x1626ba7e {
                        if callvalue() { revert(_2, _2) }
                        let param, param_1 := abi_decode_bytes32t_bytes(calldatasize())
                        let ret_1 := fun_isValidSignature(param, param_1)
                        let memPos_3 := mload(_1)
                        return(memPos_3, sub(abi_encode_bytes4(memPos_3, ret_1), memPos_3))
                    }
                    case 0x1f3966d8 {
                        if callvalue() { revert(_2, _2) }
                        let param_2, param_3, param_4 := abi_decode_addresst_array_struct_ItemSingleTarget_calldata_dyn_calldata(calldatasize())
                        modifier_auth_5098(param_2, param_3, param_4)
                        return(mload(_1), _2)
                    }
                    case 0x24b4d73f {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_4 := mload(_1)
                        return(memPos_4, sub(abi_encode_bytes32_10600(memPos_4), memPos_4))
                    }
                    case 0x2675fdd0 {
                        if callvalue() { revert(_2, _2) }
                        let param_5, param_6, param_7, param_8 := abi_decode_addresst_addresst_bytes32t_bytes(calldatasize())
                        let ret_2 := fun_isGranted(param_5, param_6, param_7, param_8)
                        let memPos_5 := mload(_1)
                        return(memPos_5, sub(abi_encode_bool(memPos_5, ret_2), memPos_5))
                    }
                    case 0x26875b1f {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_6 := mload(_1)
                        return(memPos_6, sub(abi_encode_bytes32_10603(memPos_6), memPos_6))
                    }
                    case 0x2b40c480 {
                        if callvalue() { revert(_2, _2) }
                        let param_9, param_10, param_11 := abi_decode_uint256t_array_struct_Action_calldata_dyn_calldata(calldatasize())
                        let ret_3 := modifier_auth_10605(param_9, param_10, param_11)
                        let memPos_7 := mload(_1)
                        return(memPos_7, sub(abi_encode_array_bytes_memory_ptr_dyn_memory_ptr(memPos_7, ret_3), memPos_7))
                    }
                    case 0x3659cfe6 {
                        if callvalue() { revert(_2, _2) }
                        modifier_onlyProxy_3306(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0x388da934 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let ret_4 := and(sload(301), sub(shl(160, 1), 1))
                        let memPos_8 := mload(_1)
                        return(memPos_8, sub(abi_encode_contract_IERC1271(memPos_8, ret_4), memPos_8))
                    }
                    case 0x3e2ab0d9 {
                        if callvalue() { revert(_2, _2) }
                        modifier_auth_1917(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0x4a12e253 {
                        if callvalue() { revert(_2, _2) }
                        let param_12, param_13 := abi_decode_addresst_bytes32(calldatasize())
                        modifier_auth_5078(param_12, param_13)
                        return(mload(_1), _2)
                    }
                    case 0x4f065632 {
                        if callvalue() { revert(_2, _2) }
                        let param_14, param_15, param_16, param_17 := abi_decode_addresst_addresst_uint256t_string(calldatasize())
                        modifier_auth_1856(param_14, param_15, param_16, param_17)
                        return(mload(_1), _2)
                    }
                    case 0x4f1ef286 {
                        let param_18, param_19 := abi_decode_addresst_bytes(calldatasize())
                        modifier_onlyProxy(param_18, param_19)
                        return(mload(_1), _2)
                    }
                    case 0x52d1902d {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let ret_5 := modifier_notDelegated()
                        let memPos_9 := mload(_1)
                        return(memPos_9, sub(abi_encode_bytes32(memPos_9, ret_5), memPos_9))
                    }
                    case 0x628bb478 {
                        if callvalue() { revert(_2, _2) }
                        let param_20, param_21 := abi_decode_addresst_bytes32(calldatasize())
                        let ret_6 := read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(fun_frozenPermissionHash(param_20, param_21)))
                        let memPos_10 := mload(_1)
                        return(memPos_10, sub(abi_encode_bool(memPos_10, ret_6), memPos_10))
                    }
                    case 0x660b88ee {
                        if callvalue() { revert(_2, _2) }
                        let param_22, param_23, param_24, param_25 := abi_decode_bytes_calldatat_addresst_address(calldatasize())
                        modifier_initializer(param_22, param_23, param_24, param_25)
                        return(mload(_1), _2)
                    }
                    case 0x829331a1 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_11 := mload(_1)
                        return(memPos_11, sub(abi_encode_bytes32_10619(memPos_11), memPos_11))
                    }
                    case 0x9a44bac0 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_12 := mload(_1)
                        return(memPos_12, sub(abi_encode_bytes32_10621(memPos_12), memPos_12))
                    }
                    case 0xb4276a87 {
                        if callvalue() { revert(_2, _2) }
                        let param_26, param_27 := abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(calldatasize())
                        fun_bulkOnMultiTarget(param_26, param_27)
                        return(mload(_1), _2)
                    }
                    case 0xbfe07da6 {
                        let param_28, param_29, param_30, param_31 := abi_decode_addresst_uint256t_string_calldata(calldatasize())
                        fun_deposit(param_28, param_29, param_30, param_31)
                        return(mload(_1), _2)
                    }
                    case 0xc4a50145 {
                        if callvalue() { revert(_2, _2) }
                        let param_32, param_33, param_34 := abi_decode_bytes4t_bytes4t_bytes4(calldatasize())
                        modifier_auth_2029(param_32, param_33, param_34)
                        return(mload(_1), _2)
                    }
                    case 0xce1b815f {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let ret_7 := and(sload(0x012e), sub(shl(160, 1), 1))
                        let memPos_13 := mload(_1)
                        return(memPos_13, sub(abi_encode_contract_IERC1271(memPos_13, ret_7), memPos_13))
                    }
                    case 0xce43e4e0 {
                        if callvalue() { revert(_2, _2) }
                        let param_35, param_36, param_37, param_38 := abi_decode_addresst_addresst_bytes32t_contract_IPermissionOracle(calldatasize())
                        modifier_auth(param_35, param_36, param_37, param_38)
                        return(mload(_1), _2)
                    }
                    case 0xd68bad2c {
                        if callvalue() { revert(_2, _2) }
                        let param_39, param_40, param_41 := abi_decode_addresst_addresst_bytes32(calldatasize())
                        modifier_auth_5013(param_39, param_40, param_41)
                        return(mload(_1), _2)
                    }
                    case 0xd96054c4 {
                        if callvalue() { revert(_2, _2) }
                        let param_42, param_43, param_44 := abi_decode_addresst_addresst_bytes32(calldatasize())
                        modifier_auth_5059(param_42, param_43, param_44)
                        return(mload(_1), _2)
                    }
                    case 0xda742228 {
                        if callvalue() { revert(_2, _2) }
                        modifier_auth_1618(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0xe2e35563 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_14 := mload(_1)
                        return(memPos_14, sub(abi_encode_bytes32_10632(memPos_14), memPos_14))
                    }
                    case 0xe306bee7 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_15 := mload(_1)
                        return(memPos_15, sub(abi_encode_bytes32_10634(memPos_15), memPos_15))
                    }
                    case 0xee57e36f {
                        if callvalue() { revert(_2, _2) }
                        let param_45, param_46 := abi_decode_bytes_calldata_10635(calldatasize())
                        modifier_auth_1670(param_45, param_46)
                        return(mload(_1), _2)
                    }
                    case 0xfdef9106 {
                        if callvalue() { revert(_2, _2) }
                        let param_47, param_48, param_49, param_50 := abi_decode_addresst_addresst_bytes32t_bytes(calldatasize())
                        let ret_8 := fun_isGranted(param_47, param_48, param_49, param_50)
                        let memPos_16 := mload(_1)
                        return(memPos_16, sub(abi_encode_bool(memPos_16, ret_8), memPos_16))
                    }
                }
                if iszero(calldatasize())
                {
                    fun()
                    stop()
                }
                if callvalue() { revert(0, 0) }
                fun_()
            }
            function validator_revert_bytes4(value)
            {
                if iszero(eq(value, and(value, shl(224, 0xffffffff)))) { revert(0, 0) }
            }
            function abi_decode_bytes4(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_bytes4(value)
                value0 := value
            }
            function abi_encode_bool(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, iszero(iszero(value0)))
            }
            function abi_decode(dataEnd)
            {
                if slt(add(dataEnd, not(3)), 0) { revert(0, 0) }
            }
            function abi_encode_bytes32_10594(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
            }
            function abi_encode_bytes32_10596(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
            }
            function abi_encode_bytes32_10600(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
            }
            function abi_encode_bytes32_10603(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
            }
            function abi_encode_bytes32_10619(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
            }
            function abi_encode_bytes32_10621(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
            }
            function abi_encode_bytes32_10632(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
            }
            function abi_encode_bytes32_10634(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
            }
            function abi_encode_bytes32(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, value0)
            }
            function panic_error_0x41()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x41)
                revert(0, 0x24)
            }
            function finalize_allocation_22439(memPtr)
            {
                let newFreePtr := add(memPtr, 0x20)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_22443(memPtr)
            {
                let newFreePtr := add(memPtr, 64)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_22544(memPtr)
            {
                let newFreePtr := add(memPtr, 128)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_22545(memPtr)
            {
                let newFreePtr := add(memPtr, 96)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation(memPtr, size)
            {
                let newFreePtr := add(memPtr, and(add(size, 31), not(31)))
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function array_allocation_size_bytes(length) -> size
            {
                if gt(length, 0xffffffffffffffff) { panic_error_0x41() }
                size := add(and(add(length, 31), not(31)), 0x20)
            }
            function abi_decode_available_length_bytes_10727(length, end) -> array
            {
                let _1 := array_allocation_size_bytes(length)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _1)
                array := memPtr
                mstore(memPtr, length)
                if gt(length, end) { revert(0, 0) }
                calldatacopy(add(memPtr, 0x20), 0, length)
                mstore(add(add(memPtr, length), 0x20), 0)
            }
            function abi_decode_available_length_bytes(src, length, end) -> array
            {
                let _1 := array_allocation_size_bytes(length)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _1)
                array := memPtr
                mstore(memPtr, length)
                if gt(add(src, length), end) { revert(0, 0) }
                calldatacopy(add(memPtr, 0x20), src, length)
                mstore(add(add(memPtr, length), 0x20), 0)
            }
            function abi_decode_bytes(offset, end) -> array
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                array := abi_decode_available_length_bytes(add(offset, 0x20), calldataload(offset), end)
            }
            function abi_decode_bytes32t_bytes(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                value0 := calldataload(4)
                let offset := calldataload(36)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                value1 := abi_decode_bytes(add(4, offset), dataEnd)
            }
            function abi_encode_bytes4(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, and(value0, shl(224, 0xffffffff)))
            }
            function cleanup_address(value) -> cleaned
            {
                cleaned := and(value, sub(shl(160, 1), 1))
            }
            function validator_revert_address(value)
            {
                if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
            }
            function abi_decode_addresst_array_struct_ItemSingleTarget_calldata_dyn_calldata(dataEnd) -> value0, value1, value2
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let offset := calldataload(36)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                let length := calldataload(add(4, offset))
                if gt(length, _1) { revert(0, 0) }
                if gt(add(add(offset, mul(length, 0x60)), 36), dataEnd) { revert(0, 0) }
                value1 := add(offset, 36)
                value2 := length
            }
            function abi_decode_addresst_addresst_bytes32t_bytes(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 128) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                value2 := calldataload(68)
                let offset := calldataload(100)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                value3 := abi_decode_bytes(add(4, offset), dataEnd)
            }
            function abi_decode_uint256t_array_struct_Action_calldata_dyn_calldata(dataEnd) -> value0, value1, value2
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                value0 := calldataload(4)
                let offset := calldataload(36)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                let length := calldataload(add(4, offset))
                if gt(length, _1) { revert(0, 0) }
                if gt(add(add(offset, shl(5, length)), 36), dataEnd) { revert(0, 0) }
                value1 := add(offset, 36)
                value2 := length
            }
            function abi_encode_bytes(value, pos) -> end
            {
                let length := mload(value)
                mstore(pos, length)
                let i := 0
                for { } lt(i, length) { i := add(i, 0x20) }
                {
                    let _1 := 0x20
                    mstore(add(add(pos, i), _1), mload(add(add(value, i), _1)))
                }
                if gt(i, length)
                {
                    mstore(add(add(pos, length), 0x20), 0)
                }
                end := add(add(pos, and(add(length, 31), not(31))), 0x20)
            }
            function abi_encode_array_bytes_dyn(value, pos) -> end
            {
                let length := mload(value)
                mstore(pos, length)
                let _1 := 0x20
                let updated_pos := add(pos, _1)
                let pos_1 := updated_pos
                pos := updated_pos
                let tail := add(pos_1, shl(5, length))
                let srcPtr := add(value, _1)
                let i := 0
                for { } lt(i, length) { i := add(i, 1) }
                {
                    mstore(pos, sub(tail, pos_1))
                    tail := abi_encode_bytes(mload(srcPtr), tail)
                    srcPtr := add(srcPtr, _1)
                    pos := add(pos, _1)
                }
                end := tail
            }
            function abi_encode_array_bytes_memory_ptr_dyn_memory_ptr(headStart, value0) -> tail
            {
                mstore(headStart, 32)
                tail := abi_encode_array_bytes_dyn(value0, add(headStart, 32))
            }
            function abi_decode_address(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
            }
            function abi_encode_contract_IERC1271(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
            }
            function abi_decode_addresst_bytes32(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                value1 := calldataload(36)
            }
            function abi_decode_addresst_addresst_uint256t_string(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 128) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                value2 := calldataload(68)
                let offset := calldataload(100)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                value3 := abi_decode_available_length_bytes(add(offset, 36), calldataload(add(4, offset)), dataEnd)
            }
            function abi_decode_addresst_bytes(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let offset := calldataload(36)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                value1 := abi_decode_bytes(add(4, offset), dataEnd)
            }
            function abi_decode_bytes_calldata(offset, end) -> arrayPos, length
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                length := calldataload(offset)
                if gt(length, 0xffffffffffffffff) { revert(0, 0) }
                arrayPos := add(offset, 0x20)
                if gt(add(add(offset, length), 0x20), end) { revert(0, 0) }
            }
            function abi_decode_bytes_calldatat_addresst_address(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 96) { revert(0, 0) }
                let offset := calldataload(4)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                let value0_1, value1_1 := abi_decode_bytes_calldata(add(4, offset), dataEnd)
                value0 := value0_1
                value1 := value1_1
                let value := calldataload(36)
                validator_revert_address(value)
                value2 := value
                let value_1 := calldataload(68)
                validator_revert_address(value_1)
                value3 := value_1
            }
            function abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let offset := calldataload(4)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                let length := calldataload(add(4, offset))
                if gt(length, _1) { revert(0, 0) }
                if gt(add(add(offset, mul(length, 0xa0)), 36), dataEnd) { revert(0, 0) }
                value0 := add(offset, 36)
                value1 := length
            }
            function abi_decode_addresst_uint256t_string_calldata(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 96) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                value1 := calldataload(36)
                let offset := calldataload(68)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                let value2_1, value3_1 := abi_decode_bytes_calldata(add(4, offset), dataEnd)
                value2 := value2_1
                value3 := value3_1
            }
            function abi_decode_bytes4t_bytes4t_bytes4(dataEnd) -> value0, value1, value2
            {
                if slt(add(dataEnd, not(3)), 96) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_bytes4(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_bytes4(value_1)
                value1 := value_1
                let value_2 := calldataload(68)
                validator_revert_bytes4(value_2)
                value2 := value_2
            }
            function abi_decode_addresst_addresst_bytes32t_contract_IPermissionOracle(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 128) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                value2 := calldataload(68)
                let value_2 := calldataload(100)
                validator_revert_address(value_2)
                value3 := value_2
            }
            function abi_decode_addresst_addresst_bytes32(dataEnd) -> value0, value1, value2
            {
                if slt(add(dataEnd, not(3)), 96) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                value2 := calldataload(68)
            }
            function abi_decode_bytes_calldata_10635(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let offset := calldataload(4)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                let value0_1, value1_1 := abi_decode_bytes_calldata(add(4, offset), dataEnd)
                value0 := value0_1
                value1 := value1_1
            }
            function update_storage_value_offsett_uint8_to_uint8()
            {
                sstore(0x00, or(and(sload(0x00), not(255)), 1))
            }
            function update_storage_value_offsett_bool_to_bool_10638()
            {
                sstore(0x00, or(and(sload(0x00), not(65280)), 256))
            }
            function update_storage_value_offsett_bool_to_bool()
            {
                sstore(0x00, and(sload(0x00), not(65280)))
            }
            function abi_encode_rational_by(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x01)
            }
            function modifier_initializer(var_metadata_1521_offset, var_metadata_1521_length, var_initialOwner, var__trustedForwarder)
            {
                let _1 := sload(0x00)
                let expr := iszero(and(shr(8, _1), 0xff))
                let expr_1 := expr
                if expr
                {
                    expr := lt(and(_1, 0xff), 0x01)
                }
                let expr_2 := expr
                if iszero(expr)
                {
                    let expr_3 := iszero(extcodesize(address()))
                    if expr_3
                    {
                        expr_3 := eq(and(_1, 0xff), 0x01)
                    }
                    expr_2 := expr_3
                }
                if iszero(expr_2)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 46)
                    mstore(add(memPtr, 68), "Initializable: contract is alrea")
                    mstore(add(memPtr, 100), "dy initialized")
                    revert(memPtr, 132)
                }
                update_storage_value_offsett_uint8_to_uint8()
                if expr_1
                {
                    update_storage_value_offsett_bool_to_bool_10638()
                }
                fun_initialize_inner(var_metadata_1521_offset, var_metadata_1521_length, var_initialOwner, var__trustedForwarder)
                if expr_1
                {
                    update_storage_value_offsett_bool_to_bool()
                    let _2 := mload(64)
                    log1(_2, sub(abi_encode_rational_by(_2), _2), 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498)
                }
            }
            function fun_initialize_inner(var_metadata_offset, var_metadata_length, var_initialOwner, var_trustedForwarder)
            {
                mstore(0, shl(227, 0x061b06bd))
                mstore(0x20, 0x33)
                let dataSlot := keccak256(0, 0x40)
                sstore(dataSlot, or(and(sload(dataSlot), not(255)), 0x01))
                fun_registerInterface_10642()
                fun_setMetadata(var_metadata_offset, var_metadata_length)
                fun_setTrustedForwarder(var_trustedForwarder)
                if iszero(and(shr(8, sload(0)), 0xff))
                {
                    let memPtr := mload(0x40)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 0x20)
                    mstore(add(memPtr, 36), 43)
                    mstore(add(memPtr, 68), "Initializable: contract is not i")
                    mstore(add(memPtr, 100), "nitializing")
                    revert(memPtr, 132)
                }
                fun_grantWithOracle_10643(address(), var_initialOwner)
            }
            function modifier_auth_1618(var_newTrustedForwarder)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22409(address(), caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22410(address(), _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22411(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22409(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22410(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22411(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), address())
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                    revert(_3, 132)
                }
                fun_setTrustedForwarder(var_newTrustedForwarder)
            }
            function read_from_storage_split_offset_address(slot) -> value
            {
                value := and(sload(slot), sub(shl(160, 1), 1))
            }
            function modifier_auth_1670(var__metadata_offset, var_metadata_1661_length)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22415(address(), caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22416(address(), _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22417(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22415(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22416(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22417(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), address())
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                    revert(_3, 132)
                }
                fun_setMetadata(var__metadata_offset, var_metadata_1661_length)
            }
            function modifier_auth_10605(var_callId, var_actions_offset, var_actions_length) -> _1
            {
                fun_auth(address())
                let expr_mpos := allocate_and_zero_memory_array_array_bytes_dyn(var_actions_length)
                let var_i := 0
                let var_i_1 := var_i
                for { } lt(var_i_1, var_actions_length) { }
                {
                    let expr := read_from_calldatat_address(calldata_array_index_access_struct_Action_calldata_dyn_calldata(var_actions_offset, var_actions_length, var_i_1))
                    let returnValue := calldataload(add(calldata_array_index_access_struct_Action_calldata_dyn_calldata(var_actions_offset, var_actions_length, var_i_1), 32))
                    let expr_offset := calldata_array_index_access_struct_Action_calldata_dyn_calldata(var_actions_offset, var_actions_length, var_i_1)
                    let _2 := 64
                    let expr_offset_1, expr_length := access_calldata_tail_bytes_calldata(expr_offset, add(expr_offset, _2))
                    let _3 := mload(_2)
                    let expr_component := call(gas(), expr, returnValue, _3, sub(abi_encode_bytes_calldata_to_bytes_nonPadded_inplace(expr_offset_1, expr_length, _3), _3), var_i, var_i)
                    let expr_component_mpos := extract_returndata()
                    if iszero(expr_component)
                    {
                        let _4 := mload(_2)
                        mstore(_4, shl(224, 0x080a1c27))
                        revert(_4, 4)
                    }
                    mstore(memory_array_index_access_bytes_dyn(expr_mpos, var_i_1), expr_component_mpos)
                    pop(memory_array_index_access_bytes_dyn(expr_mpos, var_i_1))
                    var_i_1 := add(var_i_1, 1)
                }
                let _5 := mload(64)
                log2(_5, sub(abi_encode_uint256_array_struct_Action_calldata_dyn_calldata_array_bytes_dyn(_5, var_callId, var_actions_offset, var_actions_length, expr_mpos), _5), 0xcc2bae44eb1963b35d985d621fb1f168ff612303a4d419476c5f40075de89ef3, caller())
                _1 := expr_mpos
            }
            function array_allocation_size_array_bytes_dyn(length) -> size
            {
                if gt(length, 0xffffffffffffffff) { panic_error_0x41() }
                size := add(shl(5, length), 0x20)
            }
            function allocate_and_zero_memory_array_array_bytes_dyn(length) -> memPtr
            {
                let _1 := array_allocation_size_array_bytes_dyn(length)
                let memPtr_1 := mload(64)
                finalize_allocation(memPtr_1, _1)
                mstore(memPtr_1, length)
                memPtr := memPtr_1
                let _2 := add(array_allocation_size_array_bytes_dyn(length), not(31))
                let i := 0
                for { } lt(i, _2) { i := add(i, 32) }
                {
                    mstore(add(add(memPtr_1, i), 32), 96)
                }
            }
            function panic_error_0x32()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x32)
                revert(0, 0x24)
            }
            function calldata_array_index_access_struct_Action_calldata_dyn_calldata(base_ref, length, index) -> addr
            {
                if iszero(lt(index, length)) { panic_error_0x32() }
                let rel_offset_of_tail := calldataload(add(base_ref, shl(5, index)))
                if iszero(slt(rel_offset_of_tail, add(sub(calldatasize(), base_ref), not(94)))) { revert(0, 0) }
                addr := add(base_ref, rel_offset_of_tail)
            }
            function read_from_calldatat_address(ptr) -> returnValue
            {
                let value := calldataload(ptr)
                validator_revert_address(value)
                returnValue := value
            }
            function access_calldata_tail_bytes_calldata(base_ref, ptr_to_tail) -> addr, length
            {
                let rel_offset_of_tail := calldataload(ptr_to_tail)
                if iszero(slt(rel_offset_of_tail, add(sub(calldatasize(), base_ref), not(30)))) { revert(0, 0) }
                let addr_1 := add(base_ref, rel_offset_of_tail)
                length := calldataload(addr_1)
                if gt(length, 0xffffffffffffffff) { revert(0, 0) }
                addr := add(addr_1, 0x20)
                if sgt(addr, sub(calldatasize(), length)) { revert(0, 0) }
            }
            function abi_encode_bytes_calldata_to_bytes_nonPadded_inplace(start, length, pos) -> end
            {
                calldatacopy(pos, start, length)
                let _1 := add(pos, length)
                mstore(_1, 0)
                end := _1
            }
            function extract_returndata() -> data
            {
                switch returndatasize()
                case 0 { data := 96 }
                default {
                    let _1 := returndatasize()
                    let _2 := array_allocation_size_bytes(_1)
                    let memPtr := mload(64)
                    finalize_allocation(memPtr, _2)
                    mstore(memPtr, _1)
                    data := memPtr
                    returndatacopy(add(memPtr, 0x20), 0, returndatasize())
                }
            }
            function memory_array_index_access_bytes_dyn(baseRef, index) -> addr
            {
                if iszero(lt(index, mload(baseRef))) { panic_error_0x32() }
                addr := add(add(baseRef, shl(5, index)), 32)
            }
            function abi_encode_bytes_calldata(start, length, pos) -> end
            {
                mstore(pos, length)
                calldatacopy(add(pos, 0x20), start, length)
                mstore(add(add(pos, length), 0x20), 0)
                end := add(add(pos, and(add(length, 31), not(31))), 0x20)
            }
            function abi_encode_uint256_array_struct_Action_calldata_dyn_calldata_array_bytes_dyn(headStart, value0, value1, value2, value3) -> tail
            {
                let _1 := 96
                let tail_1 := add(headStart, _1)
                mstore(headStart, value0)
                let _2 := 32
                mstore(add(headStart, _2), _1)
                let pos := tail_1
                mstore(tail_1, value2)
                pos := add(headStart, 128)
                let tail_2 := add(add(headStart, shl(5, value2)), 128)
                let srcPtr := value1
                let i := 0
                for { } lt(i, value2) { i := add(i, 1) }
                {
                    mstore(pos, add(sub(tail_2, headStart), not(127)))
                    let rel_offset_of_tail := calldataload(srcPtr)
                    if iszero(slt(rel_offset_of_tail, add(sub(calldatasize(), value1), not(94)))) { revert(0, 0) }
                    let value := add(rel_offset_of_tail, value1)
                    let value_1 := calldataload(value)
                    validator_revert_address(value_1)
                    mstore(tail_2, and(value_1, sub(shl(160, 1), 1)))
                    mstore(add(tail_2, _2), calldataload(add(value, _2)))
                    let _3 := 0x40
                    let rel_offset_of_tail_1 := calldataload(add(value, _3))
                    if iszero(slt(rel_offset_of_tail_1, add(sub(calldatasize(), value), not(30)))) { revert(0, 0) }
                    let value_2 := add(rel_offset_of_tail_1, value)
                    let length := calldataload(value_2)
                    if gt(length, 0xffffffffffffffff) { revert(0, 0) }
                    if sgt(value, sub(calldatasize(), length)) { revert(0, 0) }
                    mstore(add(tail_2, _3), _1)
                    tail_2 := abi_encode_bytes_calldata(add(value_2, _2), length, add(tail_2, _1))
                    srcPtr := add(srcPtr, _2)
                    pos := add(pos, _2)
                }
                mstore(add(headStart, 0x40), sub(tail_2, headStart))
                tail := abi_encode_array_bytes_dyn(value3, tail_2)
            }
            function abi_encode_rational_by_uint256(headStart, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, 0x00)
                mstore(add(headStart, 32), value1)
            }
            function abi_encode_uint256_uint256(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, value0)
                mstore(add(headStart, 32), value1)
            }
            function abi_encode_uint256_string_calldata(headStart, value0, value1, value2) -> tail
            {
                mstore(headStart, value0)
                mstore(add(headStart, 32), 64)
                tail := abi_encode_bytes_calldata(value1, value2, add(headStart, 64))
            }
            function fun_deposit(var_token, var__amount, var_reference_offset, var_reference_length)
            {
                if iszero(var__amount)
                {
                    let _1 := mload(64)
                    mstore(_1, shl(224, 0x1f2a2005))
                    revert(_1, 4)
                }
                let _2 := and(var_token, sub(shl(160, 1), 1))
                switch iszero(_2)
                case 0 {
                    if iszero(iszero(callvalue()))
                    {
                        let _3 := mload(64)
                        mstore(_3, shl(228, 0x01abd561))
                        revert(_3, sub(abi_encode_rational_by_uint256(add(_3, 4), callvalue()), _3))
                    }
                    fun_safeTransferFrom(_2, caller(), address(), var__amount)
                }
                default {
                    if iszero(eq(callvalue(), var__amount))
                    {
                        let _4 := mload(64)
                        mstore(_4, shl(228, 0x01abd561))
                        revert(_4, sub(abi_encode_uint256_uint256(add(_4, 4), var__amount, callvalue()), _4))
                    }
                }
                let _5 := mload(64)
                log3(_5, sub(abi_encode_uint256_string_calldata(_5, var__amount, var_reference_offset, var_reference_length), _5), 0x2bc500cf071be2d1c1458ed6ff484cd4db4345ada8943dee7ff29e7af3558f76, caller(), var_token)
            }
            function modifier_auth_1856(var_token, var_to, var_amount, var_reference_mpos)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22421(address(), caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22422(address(), _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22423(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22421(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22422(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22423(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), address())
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                    revert(_3, 132)
                }
                if iszero(var_amount)
                {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0x1f2a2005))
                    revert(_4, 4)
                }
                let _5 := and(var_token, sub(shl(160, 1), 1))
                switch iszero(_5)
                case 0 {
                    fun_safeTransfer(_5, var_to, var_amount)
                }
                default {
                    let expr_component := call(gas(), var_to, var_amount, mload(64), 0, 0, 0)
                    pop(extract_returndata())
                    if iszero(expr_component)
                    {
                        let _6 := mload(64)
                        mstore(_6, shl(224, 0x79bf0019))
                        revert(_6, 4)
                    }
                }
                let _7 := mload(64)
                log3(_7, sub(abi_encode_uint256_string(_7, var_amount, var_reference_mpos), _7), 0xf974f1095814c8c60c37a056415df3ca314b6b2e69abae8f25f0e69d7f68c0b2, var_token, var_to)
            }
            function abi_encode_uint256_string(headStart, value0, value1) -> tail
            {
                mstore(headStart, value0)
                mstore(add(headStart, 32), 64)
                tail := abi_encode_bytes(value1, add(headStart, 64))
            }
            function modifier_auth_1917(var_signatureValidator)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22427(address(), caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22428(address(), _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22429(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22427(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22428(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22429(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), address())
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                    revert(_3, 132)
                }
                let _4 := and(var_signatureValidator, sub(shl(160, 1), 1))
                let _5 := 0x012d
                sstore(_5, or(and(sload(_5), shl(160, 0xffffffffffffffffffffffff)), _4))
                let _6 := mload(64)
                mstore(_6, _4)
                log1(_6, 32, 0x3b25c5d3870ec0eac28822b177f18c9130233ade5b7f857c6a224a507c37fc4e)
            }
            function update_storage_value_offsett_contract_IERC1271_to_contract_IERC1271_22444(slot)
            {
                sstore(slot, or(and(sload(slot), shl(160, 0xffffffffffffffffffffffff)), 2))
            }
            function update_storage_value_offsett_contract_IERC1271_to_contract_IERC1271(slot, value)
            {
                sstore(slot, or(and(sload(slot), shl(160, 0xffffffffffffffffffffffff)), and(value, sub(shl(160, 1), 1))))
            }
            function fun_isValidSignature(var_hash, var_signature_mpos) -> var
            {
                let _1 := and(sload(0x012d), sub(shl(160, 1), 1))
                if iszero(_1)
                {
                    var := 0
                    leave
                }
                let _2 := mload(64)
                mstore(_2, shl(225, 0x0b135d3f))
                let _3 := staticcall(gas(), _1, _2, sub(abi_encode_uint256_string(add(_2, 4), var_hash, var_signature_mpos), _2), _2, 32)
                if iszero(_3)
                {
                    let pos := mload(64)
                    returndatacopy(pos, 0, returndatasize())
                    revert(pos, returndatasize())
                }
                let expr := 0
                if _3
                {
                    finalize_allocation(_2, returndatasize())
                    if slt(sub(add(_2, returndatasize()), _2), 32) { revert(expr, expr) }
                    let value := mload(_2)
                    validator_revert_bytes4(value)
                    expr := value
                }
                var := expr
            }
            function abi_encode_address_uint256_22449(headStart, value0) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
            }
            function abi_encode_address_uint256(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), value1)
            }
            function fun()
            {
                let _1 := mload(64)
                log1(_1, sub(abi_encode_address_uint256(_1, caller(), callvalue()), _1), 0x62c2c8e34665db7c56b2cabd7f5fb9702ccd352ffa8150147e450797e9f8e8f3)
            }
            function fun_()
            {
                let _1 := and(calldataload(0), shl(224, 0xffffffff))
                mstore(0, _1)
                mstore(0x20, 0xfb)
                let _2 := sload(keccak256(0, 0x40))
                if iszero(_2)
                {
                    let _3 := mload(0x40)
                    mstore(_3, shl(225, 0x2b915b13))
                    mstore(add(_3, 4), _1)
                    mstore(add(_3, 36), _2)
                    revert(_3, 68)
                }
                mstore(0, _2)
                return(0, 0x20)
            }
            function fun_setMetadata(var_metadata_offset, var_metadata_length)
            {
                let _1 := mload(64)
                mstore(_1, 32)
                log1(_1, sub(abi_encode_bytes_calldata(var_metadata_offset, var_metadata_length, add(_1, 32)), _1), 0xbb39ebb37e60fb5d606ffdb749d2336e56b88e6c88c4bd6513b308f643186eed)
            }
            function fun_setTrustedForwarder(var_trustedForwarder)
            {
                let _1 := and(var_trustedForwarder, sub(shl(160, 1), 1))
                let _2 := 0x012e
                sstore(_2, or(and(sload(_2), shl(160, 0xffffffffffffffffffffffff)), _1))
                let _3 := mload(64)
                mstore(_3, _1)
                log1(_3, 32, 0xd91237492a9e30cd2faf361fc103998a382ff0ec2b1b07dc1cbebb76ae2f1ea2)
            }
            function modifier_auth_2029(var__interfaceId, var_callbackSelector, var_magicNumber)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22433(address(), caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22434(address(), _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22435(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22433(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22434(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22435(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), address())
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                    revert(_3, 132)
                }
                fun_registerInterface(var__interfaceId)
                let _4 := shl(224, 0xffffffff)
                let _5 := and(var_magicNumber, _4)
                let _6 := and(var_callbackSelector, _4)
                mstore(0, _6)
                mstore(0x20, 0xfb)
                sstore(keccak256(0, 0x40), _5)
                let _7 := mload(0x40)
                mstore(_7, and(var__interfaceId, _4))
                mstore(add(_7, 0x20), _6)
                mstore(add(_7, 0x40), _5)
                log1(_7, 96, 0xfc72fd547553f7a663e0048e590afc9c47b56a4242e960f31cf4c62e23d308b9)
            }
            function modifier_notDelegated() -> _1
            {
                if iszero(eq(address(), and(loadimmutable("3250"), sub(shl(160, 1), 1))))
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 56)
                    mstore(add(memPtr, 68), "UUPSUpgradeable: must not be cal")
                    mstore(add(memPtr, 100), "led through delegatecall")
                    revert(memPtr, 132)
                }
                _1 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
            }
            function require_helper_stringliteral_36e1(condition)
            {
                if iszero(condition)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 44)
                    mstore(add(memPtr, 68), "Function must be called through ")
                    mstore(add(memPtr, 100), "delegatecall")
                    revert(memPtr, 132)
                }
            }
            function require_helper_stringliteral_52f1(condition)
            {
                if iszero(condition)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 44)
                    mstore(add(memPtr, 68), "Function must be called through ")
                    mstore(add(memPtr, 100), "active proxy")
                    revert(memPtr, 132)
                }
            }
            function modifier_onlyProxy_3306(var_newImplementation)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(loadimmutable("3250"), _1)
                require_helper_stringliteral_36e1(iszero(eq(address(), _2)))
                let _3 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
                require_helper_stringliteral_52f1(eq(and(sload(_3), _1), _2))
                fun_auth_10660(address())
                let memPtr := mload(64)
                finalize_allocation_22439(memPtr)
                mstore(memPtr, 0)
                calldatacopy(add(memPtr, 0x20), calldatasize(), 0)
                switch and(sload(0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143), 0xff)
                case 0 {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0x52d1902d))
                    let trySuccessCondition := staticcall(gas(), and(var_newImplementation, _1), _4, 4, _4, 0x20)
                    let expr := 0
                    if trySuccessCondition
                    {
                        finalize_allocation(_4, returndatasize())
                        expr := abi_decode_bytes32_fromMemory(_4, add(_4, returndatasize()))
                    }
                    switch iszero(trySuccessCondition)
                    case 0 {
                        require_helper_stringliteral_76b6(eq(expr, _3))
                    }
                    default {
                        let _5 := mload(64)
                        mstore(_5, shl(229, 4594637))
                        revert(_5, sub(abi_encode_stringliteral_8e8e(add(_5, 4)), _5))
                    }
                    fun_upgradeToAndCall(var_newImplementation, memPtr)
                }
                default {
                    fun_setImplementation(var_newImplementation)
                }
            }
            function modifier_onlyProxy(var_newImplementation, var_data_3327_mpos)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(loadimmutable("3250"), _1)
                require_helper_stringliteral_36e1(iszero(eq(address(), _2)))
                let _3 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
                require_helper_stringliteral_52f1(eq(and(sload(_3), _1), _2))
                fun_auth_10660(address())
                switch and(sload(0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143), 0xff)
                case 0 {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0x52d1902d))
                    let trySuccessCondition := staticcall(gas(), and(var_newImplementation, _1), _4, 4, _4, 32)
                    let expr := 0
                    if trySuccessCondition
                    {
                        finalize_allocation(_4, returndatasize())
                        expr := abi_decode_bytes32_fromMemory(_4, add(_4, returndatasize()))
                    }
                    switch iszero(trySuccessCondition)
                    case 0 {
                        require_helper_stringliteral_76b6(eq(expr, _3))
                    }
                    default {
                        let _5 := mload(64)
                        mstore(_5, shl(229, 4594637))
                        revert(_5, sub(abi_encode_stringliteral_8e8e(add(_5, 4)), _5))
                    }
                    fun_upgradeToAndCall_22441(var_newImplementation, var_data_3327_mpos)
                }
                default {
                    fun_setImplementation(var_newImplementation)
                }
            }
            function read_from_storage_split_offset_bool(slot) -> value
            {
                value := and(sload(slot), 0xff)
            }
            function fun_supportsInterface(var_interfaceId) -> var
            {
                let cleaned := and(var_interfaceId, shl(224, 0xffffffff))
                let expr := eq(cleaned, shl(224, 0x01ffc9a7))
                if iszero(expr)
                {
                    mstore(0, cleaned)
                    mstore(0x20, 0x33)
                    expr := and(sload(keccak256(0, 0x40)), 0xff)
                }
                var := expr
            }
            function fun_registerInterface_10642()
            {
                mstore(0, shl(225, 0x0b135d3f))
                mstore(0x20, 0x33)
                let dataSlot := keccak256(0, 0x40)
                sstore(dataSlot, or(and(sload(dataSlot), not(255)), 0x01))
            }
            function fun_registerInterface(var_interfaceId)
            {
                let _1 := shl(224, 0xffffffff)
                let _2 := and(var_interfaceId, _1)
                if eq(_2, _1)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 28)
                    mstore(add(memPtr, 68), "ERC165: invalid interface id")
                    revert(memPtr, 100)
                }
                mstore(0, _2)
                mstore(0x20, 0x33)
                let dataSlot := keccak256(0, 0x40)
                sstore(dataSlot, or(and(sload(dataSlot), not(255)), 0x01))
            }
            function fun_safeTransfer(var_token_address, var_to, var_value)
            {
                let expr_4054_mpos := mload(64)
                mstore(add(expr_4054_mpos, 0x20), shl(224, 0xa9059cbb))
                let _1 := sub(abi_encode_address_uint256(add(expr_4054_mpos, 36), var_to, var_value), expr_4054_mpos)
                mstore(expr_4054_mpos, add(_1, not(31)))
                finalize_allocation(expr_4054_mpos, _1)
                fun_callOptionalReturn(var_token_address, expr_4054_mpos)
            }
            function fun_safeTransferFrom(var_token_4061_address, var_from, var_to, var_value)
            {
                let expr_4080_mpos := mload(64)
                mstore(add(expr_4080_mpos, 0x20), shl(224, 0x23b872dd))
                let _1 := sub(shl(160, 1), 1)
                mstore(add(expr_4080_mpos, 36), and(var_from, _1))
                mstore(add(expr_4080_mpos, 68), and(var_to, _1))
                mstore(add(expr_4080_mpos, 100), var_value)
                mstore(expr_4080_mpos, 100)
                let newFreePtr := add(expr_4080_mpos, 160)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, expr_4080_mpos)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                fun_callOptionalReturn(var_token_4061_address, expr_4080_mpos)
            }
            function abi_decode_bool_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let value := mload(headStart)
                if iszero(eq(value, iszero(iszero(value)))) { revert(0, 0) }
                value0 := value
            }
            function require_helper_stringliteral_e11a(condition)
            {
                if iszero(condition)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 42)
                    mstore(add(memPtr, 68), "SafeERC20: ERC20 operation did n")
                    mstore(add(memPtr, 100), "ot succeed")
                    revert(memPtr, 132)
                }
            }
            function fun_callOptionalReturn(var_token_4272_address, var_data_4274_mpos)
            {
                let _1 := and(var_token_4272_address, sub(shl(160, 1), 1))
                let memPtr := mload(64)
                finalize_allocation_22443(memPtr)
                let _2 := 32
                mstore(memPtr, _2)
                mstore(add(memPtr, _2), "SafeERC20: low-level call failed")
                if iszero(extcodesize(_1))
                {
                    let memPtr_1 := mload(64)
                    mstore(memPtr_1, shl(229, 4594637))
                    mstore(add(memPtr_1, 4), _2)
                    mstore(add(memPtr_1, 36), 29)
                    mstore(add(memPtr_1, 68), "Address: call to non-contract")
                    revert(memPtr_1, 100)
                }
                let expr_component := call(gas(), _1, 0, add(var_data_4274_mpos, _2), mload(var_data_4274_mpos), 0, 0)
                let var_mpos := fun_verifyCallResult(expr_component, extract_returndata(), memPtr)
                let expr := mload(var_mpos)
                if iszero(iszero(expr))
                {
                    require_helper_stringliteral_e11a(abi_decode_bool_fromMemory(add(var_mpos, _2), add(add(var_mpos, expr), _2)))
                }
            }
            function fun_verifyCallResult(var_success, var_returndata_mpos, var_errorMessage_mpos) -> var_4580_mpos
            {
                var_4580_mpos := 96
                switch var_success
                case 0 {
                    switch iszero(iszero(mload(var_returndata_mpos)))
                    case 0 {
                        let _1 := mload(64)
                        mstore(_1, shl(229, 4594637))
                        mstore(add(_1, 4), 32)
                        revert(_1, sub(abi_encode_bytes(var_errorMessage_mpos, add(_1, 36)), _1))
                    }
                    default {
                        revert(add(32, var_returndata_mpos), mload(var_returndata_mpos))
                    }
                }
                default {
                    var_4580_mpos := var_returndata_mpos
                    leave
                }
            }
            function modifier_auth_5013(var_where, var_who, var_permissionId)
            {
                fun_auth_10686(var_where)
                let _1 := sub(shl(160, 1), 1)
                let expr := eq(and(var_where, _1), _1)
                let expr_1 := expr
                if expr
                {
                    expr := eq(and(var_who, _1), _1)
                }
                if expr
                {
                    let _2 := mload(64)
                    mstore(_2, shl(224, 0x85f1ba99))
                    revert(_2, 4)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    expr_2 := eq(and(var_who, _1), _1)
                }
                if expr_2
                {
                    let expr_3 := fun_isPermissionRestrictedForAnyAddr(var_permissionId)
                    let expr_4 := eq(var_permissionId, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                    if iszero(expr_4) { expr_4 := expr_3 }
                    if expr_4
                    {
                        let _3 := mload(64)
                        mstore(_3, shl(224, 0x24159e5b))
                        revert(_3, 4)
                    }
                    let _4 := mload(64)
                    mstore(_4, shl(231, 1285445))
                    revert(_4, 4)
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_uint256(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_5 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_5)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_contract_IERC1271_to_contract_IERC1271_22444(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_5))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle_22445(_7, var_where), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
            }
            function modifier_auth(var_where, var_who, var_permissionId, var_oracle_address)
            {
                fun_auth_10686(var_where)
                fun_grantWithOracle(var_where, var_who, var_permissionId, var_oracle_address)
            }
            function modifier_auth_5059(var_where, var_who, var_permissionId)
            {
                fun_auth_10686(var_where)
                fun_revoke(var_where, var_who, var_permissionId)
            }
            function modifier_auth_5078(var_where, var_permissionId)
            {
                fun_auth_10686(var_where)
                fun_freeze(var_where, var_permissionId)
            }
            function modifier_auth_5098(var_where, var_items_offset, var_items_5093_length)
            {
                fun_auth_10686(var_where)
                let var_i := 0x00
                for { } lt(var_i, var_items_5093_length) { }
                {
                    let var_item_mpos := convert_struct_ItemSingleTarget_calldata_to_struct_ItemSingleTarget(calldata_array_index_access_struct_ItemSingleTarget_calldata_dyn_calldata(var_items_offset, var_items_5093_length, var_i))
                    let _1 := mload(var_item_mpos)
                    validator_assert_enum_Operation(_1)
                    validator_assert_enum_Operation(_1)
                    switch iszero(_1)
                    case 0 {
                        let _2 := mload(var_item_mpos)
                        validator_assert_enum_Operation(_2)
                        validator_assert_enum_Operation(_2)
                        switch eq(_2, 1)
                        case 0 {
                            let _3 := mload(var_item_mpos)
                            validator_assert_enum_Operation(_3)
                            validator_assert_enum_Operation(_3)
                            if eq(_3, 2)
                            {
                                fun_freeze(var_where, mload(add(var_item_mpos, 64)))
                            }
                        }
                        default {
                            let _4 := cleanup_address(mload(add(var_item_mpos, 32)))
                            fun_revoke(var_where, _4, mload(add(var_item_mpos, 64)))
                        }
                    }
                    default {
                        let _5 := cleanup_address(mload(add(var_item_mpos, 32)))
                        fun_grantWithOracle_10717(var_where, _5, mload(add(var_item_mpos, 64)))
                    }
                    var_i := add(var_i, 1)
                }
            }
            function calldata_array_index_access_struct_ItemSingleTarget_calldata_dyn_calldata(base_ref, length, index) -> addr
            {
                if iszero(lt(index, length)) { panic_error_0x32() }
                addr := add(base_ref, mul(index, 96))
            }
            function abi_decode_enum_Operation(offset) -> value
            {
                value := calldataload(offset)
                if iszero(lt(value, 4)) { revert(0, 0) }
            }
            function convert_struct_ItemSingleTarget_calldata_to_struct_ItemSingleTarget(value) -> converted
            {
                if slt(sub(calldatasize(), value), 0x60) { revert(0, 0) }
                let memPtr := mload(64)
                let newFreePtr := add(memPtr, 0x60)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                mstore(memPtr, abi_decode_enum_Operation(value))
                let value_1 := calldataload(add(value, 32))
                validator_revert_address(value_1)
                mstore(add(memPtr, 32), value_1)
                mstore(add(memPtr, 64), calldataload(add(value, 64)))
                converted := memPtr
            }
            function validator_assert_enum_Operation(value)
            {
                if iszero(lt(value, 4))
                {
                    mstore(0, shl(224, 0x4e487b71))
                    mstore(4, 0x21)
                    revert(0, 0x24)
                }
            }
            function calldata_array_index_access_struct_ItemMultiTarget_calldata_dyn_calldata(base_ref, length, index) -> addr
            {
                if iszero(lt(index, length)) { panic_error_0x32() }
                addr := add(base_ref, mul(index, 160))
            }
            function convert_struct_ItemMultiTarget_calldata_to_struct_ItemMultiTarget(value) -> converted
            {
                if slt(sub(calldatasize(), value), 0xa0) { revert(0, 0) }
                let memPtr := mload(64)
                let newFreePtr := add(memPtr, 0xa0)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                mstore(memPtr, abi_decode_enum_Operation(value))
                let value_1 := calldataload(add(value, 32))
                validator_revert_address(value_1)
                mstore(add(memPtr, 32), value_1)
                let value_2 := calldataload(add(value, 64))
                validator_revert_address(value_2)
                mstore(add(memPtr, 64), value_2)
                let value_3 := calldataload(add(value, 96))
                validator_revert_address(value_3)
                mstore(add(memPtr, 96), value_3)
                mstore(add(memPtr, 128), calldataload(add(value, 128)))
                converted := memPtr
            }
            function fun_bulkOnMultiTarget(var_items_5175_offset, var_items_length)
            {
                let var_i := 0x00
                for { } lt(var_i, var_items_length) { }
                {
                    let var_item_mpos := convert_struct_ItemMultiTarget_calldata_to_struct_ItemMultiTarget(calldata_array_index_access_struct_ItemMultiTarget_calldata_dyn_calldata(var_items_5175_offset, var_items_length, var_i))
                    let _1 := add(var_item_mpos, 32)
                    fun_auth_10686(cleanup_address(mload(_1)))
                    let _2 := mload(var_item_mpos)
                    validator_assert_enum_Operation(_2)
                    validator_assert_enum_Operation(_2)
                    switch iszero(_2)
                    case 0 {
                        let _3 := mload(var_item_mpos)
                        validator_assert_enum_Operation(_3)
                        validator_assert_enum_Operation(_3)
                        switch eq(_3, 1)
                        case 0 {
                            let _4 := mload(var_item_mpos)
                            validator_assert_enum_Operation(_4)
                            validator_assert_enum_Operation(_4)
                            switch eq(_4, 2)
                            case 0 {
                                let _5 := mload(var_item_mpos)
                                validator_assert_enum_Operation(_5)
                                validator_assert_enum_Operation(_5)
                                if eq(_5, 3)
                                {
                                    let _6 := cleanup_address(mload(_1))
                                    let _7 := cleanup_address(mload(add(var_item_mpos, 64)))
                                    let _8 := mload(add(var_item_mpos, 128))
                                    fun_grantWithOracle(_6, _7, _8, cleanup_address(cleanup_address(mload(add(var_item_mpos, 96)))))
                                }
                            }
                            default {
                                let _9 := cleanup_address(mload(_1))
                                fun_freeze(_9, mload(add(var_item_mpos, 128)))
                            }
                        }
                        default {
                            let _10 := cleanup_address(mload(_1))
                            let _11 := cleanup_address(mload(add(var_item_mpos, 64)))
                            fun_revoke(_10, _11, mload(add(var_item_mpos, 128)))
                        }
                    }
                    default {
                        let _12 := cleanup_address(mload(_1))
                        let _13 := cleanup_address(mload(add(var_item_mpos, 64)))
                        fun_grantWithOracle_10717(_12, _13, mload(add(var_item_mpos, 128)))
                    }
                    var_i := add(var_i, 1)
                }
            }
            function fun_isGranted(var_where, var_who, var_permissionId, var__data_mpos) -> var
            {
                let expr := fun__isGranted(var_where, var_who, var_permissionId, var__data_mpos)
                if iszero(expr)
                {
                    expr := fun_isGranted_10714(var_where, var_permissionId, var__data_mpos)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_10715(var_who, var_permissionId, var__data_mpos)
                }
                var := expr_1
            }
            function mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0xca)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_bool_of_bytes32(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0xc9)
                dataSlot := keccak256(0, 0x40)
            }
            function abi_encode_address_address_bytes32_22451(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
            }
            function abi_encode_address_address_bytes32(headStart, value0, value1, value2) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), value2)
            }
            function abi_encode_address_contract_IPermissionOracle_22445(headStart, value0) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), 2)
            }
            function abi_encode_address_contract_IPermissionOracle(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
            }
            function fun_grantWithOracle_10643(var_where, var_who)
            {
                let _1 := sub(shl(160, 1), 1)
                let expr := eq(and(var_where, _1), _1)
                let expr_1 := expr
                if expr
                {
                    expr := eq(and(var_who, _1), _1)
                }
                if expr
                {
                    let _2 := mload(64)
                    mstore(_2, shl(224, 0x85f1ba99))
                    revert(_2, 4)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    expr_2 := eq(and(var_who, _1), _1)
                }
                if expr_2
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x24159e5b))
                    revert(_3, 4)
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(fun_frozenPermissionHash_22448(var_where)))
                {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0xfda9b7e9))
                    revert(_4, sub(abi_encode_address_uint256_22449(add(_4, 4), var_where), _4))
                }
                let expr_3 := fun_permissionHash_22450(var_where, var_who)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_3)), _1)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(225, 0x154c1277))
                    revert(_5, sub(abi_encode_address_address_bytes32_22451(add(_5, 4), var_where, var_who), _5))
                }
                update_storage_value_offsett_contract_IERC1271_to_contract_IERC1271_22444(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_3))
                let _6 := mload(64)
                log4(_6, sub(abi_encode_address_contract_IPermissionOracle_22445(_6, var_where), _6), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33, caller(), var_who)
            }
            function fun_grantWithOracle_10717(var_where, var_who, var_permissionId)
            {
                let _1 := sub(shl(160, 1), 1)
                let expr := eq(and(var_where, _1), _1)
                let expr_1 := expr
                if expr
                {
                    expr := eq(and(var_who, _1), _1)
                }
                if expr
                {
                    let _2 := mload(64)
                    mstore(_2, shl(224, 0x85f1ba99))
                    revert(_2, 4)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    expr_2 := eq(and(var_who, _1), _1)
                }
                if expr_2
                {
                    let expr_3 := fun_isPermissionRestrictedForAnyAddr(var_permissionId)
                    let expr_4 := eq(var_permissionId, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                    if iszero(expr_4) { expr_4 := expr_3 }
                    if expr_4
                    {
                        let _3 := mload(64)
                        mstore(_3, shl(224, 0x24159e5b))
                        revert(_3, 4)
                    }
                    let _4 := mload(64)
                    mstore(_4, shl(231, 1285445))
                    revert(_4, 4)
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_uint256(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_5 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_5)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_contract_IERC1271_to_contract_IERC1271_22444(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_5))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle_22445(_7, var_where), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
            }
            function fun_grantWithOracle(var_where, var_who, var_permissionId, var_oracle_5378_address)
            {
                let _1 := sub(shl(160, 1), 1)
                let expr := eq(and(var_where, _1), _1)
                let expr_1 := expr
                if expr
                {
                    expr := eq(and(var_who, _1), _1)
                }
                if expr
                {
                    let _2 := mload(64)
                    mstore(_2, shl(224, 0x85f1ba99))
                    revert(_2, 4)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    expr_2 := eq(and(var_who, _1), _1)
                }
                if expr_2
                {
                    let expr_3 := fun_isPermissionRestrictedForAnyAddr(var_permissionId)
                    let expr_4 := eq(var_permissionId, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                    if iszero(expr_4) { expr_4 := expr_3 }
                    if expr_4
                    {
                        let _3 := mload(64)
                        mstore(_3, shl(224, 0x24159e5b))
                        revert(_3, 4)
                    }
                    if eq(and(var_oracle_5378_address, _1), 0x02)
                    {
                        let _4 := mload(64)
                        mstore(_4, shl(231, 1285445))
                        revert(_4, 4)
                    }
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_uint256(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_5 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_5)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_contract_IERC1271_to_contract_IERC1271(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_5), and(var_oracle_5378_address, _1))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle(_7, var_where, var_oracle_5378_address), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
            }
            function fun_isPermissionRestrictedForAnyAddr(var_permissionId) -> var
            {
                let expr := eq(var_permissionId, 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                if iszero(expr)
                {
                    expr := eq(var_permissionId, 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := eq(var_permissionId, 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    expr_2 := eq(var_permissionId, 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                }
                let expr_3 := expr_2
                if iszero(expr_2)
                {
                    expr_3 := eq(var_permissionId, 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                }
                let expr_4 := expr_3
                if iszero(expr_3)
                {
                    expr_4 := eq(var_permissionId, 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                }
                var := expr_4
            }
            function fun_revoke(var_where, var_who, var_permissionId)
            {
                mstore(0, fun_frozenPermissionHash(var_where, var_permissionId))
                mstore(0x20, 0xca)
                if and(sload(keccak256(0, 0x40)), 0xff)
                {
                    let _1 := mload(0x40)
                    mstore(_1, shl(224, 0xfda9b7e9))
                    revert(_1, sub(abi_encode_address_uint256(add(_1, 4), var_where, var_permissionId), _1))
                }
                let expr := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr)), sub(shl(160, 1), 1)))
                {
                    let _2 := mload(0x40)
                    mstore(_2, shl(225, 0x15845b1d))
                    revert(_2, sub(abi_encode_address_address_bytes32(add(_2, 4), var_where, var_who, var_permissionId), _2))
                }
                let _3 := mapping_index_access_mapping_bytes32_bool_of_bytes32(expr)
                sstore(_3, and(sload(_3), shl(160, 0xffffffffffffffffffffffff)))
                let _4 := mload(0x40)
                log4(_4, sub(abi_encode_contract_IERC1271(_4, var_where), _4), 0x3ca48185ec3f6e47e24db18b13f1c65b1ce05da1659f9c1c4fe717dda5f67524, var_permissionId, caller(), var_who)
            }
            function fun_freeze(var_where, var_permissionId)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(var_where, _1)
                if eq(_2, _1)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0xde24c9bb))
                    revert(_3, 4)
                }
                let expr := fun_frozenPermissionHash(var_where, var_permissionId)
                mstore(0, expr)
                mstore(0x20, 0xca)
                if and(sload(keccak256(0, 0x40)), 0xff)
                {
                    let _4 := mload(0x40)
                    mstore(_4, shl(224, 0xfda9b7e9))
                    revert(_4, sub(abi_encode_address_uint256(add(_4, 4), var_where, var_permissionId), _4))
                }
                let _5 := mapping_index_access_mapping_bytes32_bool_of_bytes32_10616(expr)
                sstore(_5, or(and(sload(_5), not(255)), 0x01))
                let _6 := mload(0x40)
                mstore(_6, _2)
                log3(_6, 0x20, 0x5bc82808e00f308181e1f2385733b7e64006e784fbe7ed607e74c16580eb6d88, var_permissionId, caller())
            }
            function abi_encode_address_address_bytes32_bytes_39185(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39189(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39193(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39197(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39201(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39205(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39209(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39213(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_22457(headStart, value0, value2, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), value2)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39217(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39221(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39225(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39229(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39233(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39237(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39241(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39245(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_22459(headStart, value1, value2, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), value2)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39249(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39253(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39257(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39265(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39269(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_39273(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function fun_isGranted_22410(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39185(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22416(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39189(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22422(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39193(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22428(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39197(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22434(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39201(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22473(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39205(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22497(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39209(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22509(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39213(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_10714(var_where, var_permissionId, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_22457(add(_3, 4), var_where, var_permissionId, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22411(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39217(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22417(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39221(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22423(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39225(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22429(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39229(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22435(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39233(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22474(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39237(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22498(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39241(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22510(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39245(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_10715(var_who, var_permissionId, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_22459(add(_3, 4), var_who, var_permissionId, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22409(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x06d294bc8cbad2e393408b20dd019a772661f60b8d633e56761157cb1ec85f8c)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39249(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22415(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x4707e94b25cfce1a7c363508fbb838c35864388ad77284b248282b9746982b9b)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39253(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22421(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xfa65bb7a7a179a721a21a3cefd5b633e9a9673e67b6319105b4d3d604c5bf92b)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39257(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22427(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x0dcbfb19b09fb8ff4e9af583d4b8e9c8127cc1b26529b4d96dd3b7e778088372)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22433(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xfaf505be9907aa6951c2ebe5b0312f4980e14f21912ed355372103cc8bd683bc)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39265(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22472(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39269(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22496(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _3 := mload(64)
                mstore(_3, shl(228, 0x02675fdd))
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_39273(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_isGranted_22508(var_where, var_who, var_data_mpos) -> var
            {
                let _1 := sub(shl(160, 1), 1)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(fun_permissionHash_22450(var_where, var_who))), _1)
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _2 := mload(64)
                mstore(_2, shl(228, 0x02675fdd))
                mstore(add(_2, 4), and(var_where, _1))
                mstore(add(_2, 36), and(var_who, _1))
                mstore(add(_2, 68), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(_2, 100), 128)
                let trySuccessCondition := staticcall(gas(), value, _2, sub(abi_encode_bytes(var_data_mpos, add(_2, 132)), _2), _2, 32)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_2, returndatasize())
                    expr := abi_decode_bool_fromMemory(_2, add(_2, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun__isGranted(var_where, var_who, var_permissionId, var_data_5593_mpos) -> var
            {
                let _1 := sub(shl(160, 1), 1)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(fun_permissionHash(var_where, var_who, var_permissionId))), _1)
                if iszero(value)
                {
                    var := 0
                    leave
                }
                if eq(value, 0x02)
                {
                    var := 0x01
                    leave
                }
                let _2 := mload(64)
                mstore(_2, shl(228, 0x02675fdd))
                mstore(add(_2, 4), and(var_where, _1))
                mstore(add(_2, 36), and(var_who, _1))
                mstore(add(_2, 68), var_permissionId)
                mstore(add(_2, 100), 128)
                let trySuccessCondition := staticcall(gas(), value, _2, sub(abi_encode_bytes(var_data_5593_mpos, add(_2, 132)), _2), _2, 32)
                let expr := 0
                if trySuccessCondition
                {
                    finalize_allocation(_2, returndatasize())
                    expr := abi_decode_bool_fromMemory(_2, add(_2, returndatasize()))
                }
                if iszero(iszero(trySuccessCondition))
                {
                    if expr
                    {
                        var := 0x01
                        leave
                    }
                }
                var := 0
            }
            function fun_auth(var_where)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22472(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22473(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22474(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22472(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22473(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22474(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), and(var_where, sub(shl(160, 1), 1)))
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d)
                    revert(_3, 132)
                }
            }
            function fun_auth_10660(var_where)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22496(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22497(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22498(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22496(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22497(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22498(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), and(var_where, sub(shl(160, 1), 1)))
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0x1f53edd44352e5d15bad2b29233baa93bcd595e09457780bc7c5445bbbe751cc)
                    revert(_3, 132)
                }
            }
            function fun_auth_10686(var_where)
            {
                let _1 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                let expr := fun_isGranted_22508(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_22509(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_22510(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10727(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_22508(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_22509(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_22510(caller(), _2)
                    }
                    expr_2 := expr_4
                }
                if iszero(expr_2)
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x2c9fc7d5))
                    mstore(add(_3, 4), address())
                    mstore(add(_3, 36), and(var_where, sub(shl(160, 1), 1)))
                    mstore(add(_3, 68), caller())
                    mstore(add(_3, 100), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                    revert(_3, 132)
                }
            }
            function fun_permissionHash_22450(var_where, var_who) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_22544(expr_mpos)
                var := keccak256(_1, mload(expr_mpos))
            }
            function fun_permissionHash(var_where, var_who, var_permissionId) -> var
            {
                let expr_5706_mpos := mload(64)
                let _1 := add(expr_5706_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_5706_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_5706_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_5706_mpos, 82), var_permissionId)
                mstore(expr_5706_mpos, 82)
                finalize_allocation_22544(expr_5706_mpos)
                var := keccak256(_1, mload(expr_5706_mpos))
            }
            function fun_frozenPermissionHash_22448(var_where) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "IMMUTABLE")
                mstore(add(expr_mpos, 41), and(shl(96, var_where), not(0xffffffffffffffffffffffff)))
                mstore(add(expr_mpos, 61), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 61)
                finalize_allocation_22545(expr_mpos)
                var := keccak256(_1, mload(expr_mpos))
            }
            function fun_frozenPermissionHash(var_where, var_permissionId) -> var
            {
                let expr_5726_mpos := mload(64)
                let _1 := add(expr_5726_mpos, 0x20)
                mstore(_1, "IMMUTABLE")
                mstore(add(expr_5726_mpos, 41), and(shl(96, var_where), not(0xffffffffffffffffffffffff)))
                mstore(add(expr_5726_mpos, 61), var_permissionId)
                mstore(expr_5726_mpos, 61)
                finalize_allocation_22545(expr_5726_mpos)
                var := keccak256(_1, mload(expr_5726_mpos))
            }
            function abi_decode_bytes32_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                value0 := mload(headStart)
            }
            function require_helper_stringliteral_76b6(condition)
            {
                if iszero(condition)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 41)
                    mstore(add(memPtr, 68), "ERC1967Upgrade: unsupported prox")
                    mstore(add(memPtr, 100), "iableUUID")
                    revert(memPtr, 132)
                }
            }
            function abi_encode_stringliteral_8e8e(headStart) -> tail
            {
                mstore(headStart, 32)
                mstore(add(headStart, 32), 46)
                mstore(add(headStart, 64), "ERC1967Upgrade: new implementati")
                mstore(add(headStart, 96), "on is not UUPS")
                tail := add(headStart, 128)
            }
            function fun_setImplementation(var_newImplementation)
            {
                if iszero(extcodesize(var_newImplementation))
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 45)
                    mstore(add(memPtr, 68), "ERC1967: new implementation is n")
                    mstore(add(memPtr, 100), "ot a contract")
                    revert(memPtr, 132)
                }
                let _1 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
                sstore(_1, or(and(sload(_1), shl(160, 0xffffffffffffffffffffffff)), and(var_newImplementation, sub(shl(160, 1), 1))))
            }
            function fun_upgradeToAndCall(var_newImplementation, var_data_mpos)
            {
                fun_setImplementation(var_newImplementation)
                let _1 := mload(64)
                log2(_1, 0, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
                let _2 := iszero(mload(var_data_mpos))
                let expr := iszero(_2)
                if _2 { expr := 0 }
                if expr
                {
                    if iszero(extcodesize(var_newImplementation))
                    {
                        mstore(_1, shl(229, 4594637))
                        mstore(add(_1, 4), 32)
                        mstore(add(_1, 36), 38)
                        mstore(add(_1, 68), "Address: delegate call to non-co")
                        mstore(add(_1, 100), "ntract")
                        revert(_1, 132)
                    }
                    let expr_component := delegatecall(gas(), var_newImplementation, add(var_data_mpos, 0x20), mload(var_data_mpos), 0, 0)
                    let expr_component_mpos := extract_returndata()
                    let memPtr := mload(64)
                    finalize_allocation_22545(memPtr)
                    mstore(memPtr, 39)
                    mstore(add(memPtr, 0x20), "Address: low-level delegate call")
                    mstore(add(memPtr, 64), " failed")
                    pop(fun_verifyCallResult(expr_component, expr_component_mpos, memPtr))
                }
            }
            function fun_upgradeToAndCall_22441(var_newImplementation, var_data_mpos)
            {
                fun_setImplementation(var_newImplementation)
                let _1 := mload(64)
                log2(_1, 0, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
                let _2 := iszero(mload(var_data_mpos))
                let expr := iszero(_2)
                if _2 { expr := 0x01 }
                if expr
                {
                    if iszero(extcodesize(var_newImplementation))
                    {
                        mstore(_1, shl(229, 4594637))
                        mstore(add(_1, 4), 32)
                        mstore(add(_1, 36), 38)
                        mstore(add(_1, 68), "Address: delegate call to non-co")
                        mstore(add(_1, 100), "ntract")
                        revert(_1, 132)
                    }
                    let expr_component := delegatecall(gas(), var_newImplementation, add(var_data_mpos, 0x20), mload(var_data_mpos), 0, 0)
                    let expr_component_mpos := extract_returndata()
                    let memPtr := mload(64)
                    finalize_allocation_22545(memPtr)
                    mstore(memPtr, 39)
                    mstore(add(memPtr, 0x20), "Address: low-level delegate call")
                    mstore(add(memPtr, 64), " failed")
                    pop(fun_verifyCallResult(expr_component, expr_component_mpos, memPtr))
                }
            }
        }
        data ".metadata" hex"a3646970667358221220ae080e6450ee289068d8834438979b96c310a4f66aee28a77dcc14eab31e0d306c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
