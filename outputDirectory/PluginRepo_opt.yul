/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 24:"@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol", 25:"@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol", 27:"@openzeppelin/contracts/interfaces/draft-IERC1822.sol", 30:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol", 33:"@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol", 54:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionManager.sol", 57:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/plugin/IPluginRepo.sol", 59:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/plugin/PluginRepo.sol"
object "PluginRepo_2727" {
    code {
        {
            let _1 := memoryguard(0xa0)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            mstore(128, address())
            let _2 := datasize("PluginRepo_2727_deployed")
            codecopy(_1, dataoffset("PluginRepo_2727_deployed"), _2)
            setimmutable(_1, "5901", mload(128))
            return(_1, _2)
        }
    }
    /// @use-src 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 20:"@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol", 24:"@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol", 30:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol", 33:"@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol", 39:"@openzeppelin/contracts/utils/Address.sol", 41:"@openzeppelin/contracts/utils/StorageSlot.sol", 54:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionManager.sol", 59:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/plugin/PluginRepo.sol"
    object "PluginRepo_2727_deployed" {
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
                        return(128, add(abi_encode_bool_10100(fun_supportsInterface(abi_decode_bytes4(calldatasize()))), not(127)))
                    }
                    case 0x09e56b14 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos := mload(_1)
                        return(memPos, sub(abi_encode_bytes32_10102(memPos), memPos))
                    }
                    case 0x1f3966d8 {
                        if callvalue() { revert(_2, _2) }
                        let param, param_1, param_2 := abi_decode_addresst_array_struct_ItemSingleTarget_calldata_dyn_calldata(calldatasize())
                        modifier_auth_5098(param, param_1, param_2)
                        return(mload(_1), _2)
                    }
                    case 0x2675fdd0 {
                        if callvalue() { revert(_2, _2) }
                        let param_3, param_4, param_5, param_6 := abi_decode_addresst_addresst_bytes32t_bytes(calldatasize())
                        let ret := fun_isGranted(param_3, param_4, param_5, param_6)
                        let memPos_1 := mload(_1)
                        return(memPos_1, sub(abi_encode_bool(memPos_1, ret), memPos_1))
                    }
                    case 0x3659cfe6 {
                        if callvalue() { revert(_2, _2) }
                        modifier_onlyProxy(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0x4a12e253 {
                        if callvalue() { revert(_2, _2) }
                        let param_7, param_8 := abi_decode_addresst_bytes32(calldatasize())
                        modifier_auth_5078(param_7, param_8)
                        return(mload(_1), _2)
                    }
                    case 0x4cdbf0c3 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_2 := mload(_1)
                        return(memPos_2, sub(abi_encode_bytes32_10108(memPos_2), memPos_2))
                    }
                    case 0x4f1ef286 {
                        let param_9, param_10 := abi_decode_addresst_bytes(calldatasize())
                        modifier_onlyProxy_5981(param_9, param_10)
                        return(mload(_1), _2)
                    }
                    case 0x50abe910 {
                        if callvalue() { revert(_2, _2) }
                        let ret_1 := fun_getLatestVersion_2602(abi_decode_address(calldatasize()))
                        let memPos_3 := mload(_1)
                        return(memPos_3, sub(abi_encode_struct_Version(memPos_3, ret_1), memPos_3))
                    }
                    case 0x51e2918f {
                        if callvalue() { revert(_2, _2) }
                        let param_11, param_12, param_13, param_14 := abi_decode_uint8t_addresst_bytes_calldata(calldatasize())
                        modifier_auth_2405(param_11, param_12, param_13, param_14)
                        return(mload(_1), _2)
                    }
                    case 0x52d1902d {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let ret_2 := modifier_notDelegated()
                        let memPos_4 := mload(_1)
                        return(memPos_4, sub(abi_encode_bytes32(memPos_4, ret_2), memPos_4))
                    }
                    case 0x628bb478 {
                        if callvalue() { revert(_2, _2) }
                        let param_15, param_16 := abi_decode_addresst_bytes32(calldatasize())
                        let ret_3 := read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(fun_frozenPermissionHash(param_15, param_16)))
                        let memPos_5 := mload(_1)
                        return(memPos_5, sub(abi_encode_bool(memPos_5, ret_3), memPos_5))
                    }
                    case 0x7be0ca5e {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let ret_4 := sload(101)
                        let memPos_6 := mload(_1)
                        return(memPos_6, sub(abi_encode_bytes32(memPos_6, ret_4), memPos_6))
                    }
                    case 0x9aaf9f08 {
                        if callvalue() { revert(_2, _2) }
                        let ret_5 := fun_getVersion(abi_decode_bytes32(calldatasize()))
                        let memPos_7 := mload(_1)
                        return(memPos_7, sub(abi_encode_struct_Version(memPos_7, ret_5), memPos_7))
                    }
                    case 0x9af3e909 {
                        if callvalue() { revert(_2, _2) }
                        let ret_6 := fun_getVersion_2619(abi_decode_struct_Tag_calldata(calldatasize()))
                        let memPos_8 := mload(_1)
                        return(memPos_8, sub(abi_encode_struct_Version(memPos_8, ret_6), memPos_8))
                    }
                    case 0xb4276a87 {
                        if callvalue() { revert(_2, _2) }
                        let param_17, param_18 := abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(calldatasize())
                        fun_bulkOnMultiTarget(param_17, param_18)
                        return(mload(_1), _2)
                    }
                    case 0xc4d66de8 {
                        if callvalue() { revert(_2, _2) }
                        modifier_initializer(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0xcc98b8f5 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_9 := mload(_1)
                        return(memPos_9, sub(abi_encode_bytes32_10123(memPos_9), memPos_9))
                    }
                    case 0xcdac28a1 {
                        if callvalue() { revert(_2, _2) }
                        let ret_7 := fun_versionCount(abi_decode_uint8(calldatasize()))
                        let memPos_10 := mload(_1)
                        return(memPos_10, sub(abi_encode_bytes32(memPos_10, ret_7), memPos_10))
                    }
                    case 0xce43e4e0 {
                        if callvalue() { revert(_2, _2) }
                        let param_19, param_20, param_21, param_22 := abi_decode_addresst_addresst_bytes32t_contract_IPermissionOracle(calldatasize())
                        modifier_auth(param_19, param_20, param_21, param_22)
                        return(mload(_1), _2)
                    }
                    case 0xd68bad2c {
                        if callvalue() { revert(_2, _2) }
                        let param_23, param_24, param_25 := abi_decode_addresst_addresst_bytes32(calldatasize())
                        modifier_auth_5013(param_23, param_24, param_25)
                        return(mload(_1), _2)
                    }
                    case 0xd96054c4 {
                        if callvalue() { revert(_2, _2) }
                        let param_26, param_27, param_28 := abi_decode_addresst_addresst_bytes32(calldatasize())
                        modifier_auth_5059(param_26, param_27, param_28)
                        return(mload(_1), _2)
                    }
                    case 0xe0589bd3 {
                        if callvalue() { revert(_2, _2) }
                        let ret_8 := fun_getLatestVersion(abi_decode_uint8(calldatasize()))
                        let memPos_11 := mload(_1)
                        return(memPos_11, sub(abi_encode_struct_Version(memPos_11, ret_8), memPos_11))
                    }
                }
                revert(0, 0)
            }
            function abi_decode_bytes4(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                if iszero(eq(value, and(value, shl(224, 0xffffffff)))) { revert(0, 0) }
                value0 := value
            }
            function abi_encode_bool_10100(value0) -> tail
            {
                tail := 160
                mstore(128, iszero(iszero(value0)))
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
            function abi_encode_bytes32_10102(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
            }
            function abi_encode_bytes32_10108(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
            }
            function abi_encode_bytes32_10123(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
            }
            function abi_encode_bytes32(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, value0)
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
            function panic_error_0x41()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x41)
                revert(0, 0x24)
            }
            function finalize_allocation_10178(memPtr)
            {
                let newFreePtr := add(memPtr, 128)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_10180(memPtr)
            {
                let newFreePtr := add(memPtr, 0x40)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(0x40, newFreePtr)
            }
            function finalize_allocation_20158(memPtr)
            {
                let newFreePtr := add(memPtr, 64)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_20236(memPtr)
            {
                let newFreePtr := add(memPtr, 96)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_20237(memPtr)
            {
                let newFreePtr := add(memPtr, 0x20)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation(memPtr, size)
            {
                let newFreePtr := add(memPtr, and(add(size, 31), not(31)))
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function allocate_memory_10146() -> memPtr
            {
                memPtr := mload(64)
                finalize_allocation_20158(memPtr)
            }
            function allocate_memory() -> memPtr
            {
                memPtr := mload(64)
                finalize_allocation_10178(memPtr)
            }
            function array_allocation_size_bytes(length) -> size
            {
                if gt(length, 0xffffffffffffffff) { panic_error_0x41() }
                size := add(and(add(length, 31), not(31)), 0x20)
            }
            function abi_decode_available_length_bytes_10234(length, end) -> array
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
            function abi_decode_address(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
            }
            function abi_decode_addresst_bytes32(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                value1 := calldataload(36)
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
            function abi_encode_struct_Version(headStart, value0) -> tail
            {
                mstore(headStart, 32)
                let _1 := mload(value0)
                mstore(add(headStart, 32), and(mload(_1), 0xff))
                mstore(add(headStart, 64), and(mload(add(_1, 32)), 0xffff))
                mstore(add(headStart, 96), and(mload(add(value0, 32)), sub(shl(160, 1), 1)))
                mstore(add(headStart, 128), iszero(iszero(mload(add(value0, 64)))))
                let memberValue0 := mload(add(value0, 96))
                mstore(add(headStart, 0xa0), 0xa0)
                tail := abi_encode_bytes(memberValue0, add(headStart, 192))
            }
            function abi_decode_uint8t_addresst_bytes_calldata(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 96) { revert(0, 0) }
                let value := calldataload(4)
                if iszero(eq(value, and(value, 0xff))) { revert(0, 0) }
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                let offset := calldataload(68)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                let length := calldataload(add(4, offset))
                if gt(length, _1) { revert(0, 0) }
                if gt(add(add(offset, length), 36), dataEnd) { revert(0, 0) }
                value2 := add(offset, 36)
                value3 := length
            }
            function abi_decode_bytes32(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                value0 := calldataload(4)
            }
            function abi_decode_struct_Tag_calldata(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                value0 := 4
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
            function abi_decode_uint8(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                if iszero(eq(value, and(value, 0xff))) { revert(0, 0) }
                value0 := value
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
            function update_storage_value_offsett_uint8_to_uint8()
            {
                sstore(0x00, or(and(sload(0x00), not(255)), 1))
            }
            function update_storage_value_offsett_bool_to_bool()
            {
                sstore(0x00, or(and(sload(0x00), not(65280)), 256))
            }
            function update_storage_value_offsett_bool_to_bool_10131()
            {
                sstore(0x00, and(sload(0x00), not(65280)))
            }
            function abi_encode_rational_by(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x01)
            }
            function modifier_initializer(var_initialOwner)
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
                    update_storage_value_offsett_bool_to_bool()
                }
                fun_initialize_inner(var_initialOwner)
                if expr_1
                {
                    update_storage_value_offsett_bool_to_bool_10131()
                    let _2 := mload(64)
                    log1(_2, sub(abi_encode_rational_by(_2), _2), 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498)
                }
            }
            function fun_initialize_inner(var_initialOwner)
            {
                if iszero(and(shr(8, sload(0x00)), 0xff))
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 43)
                    mstore(add(memPtr, 68), "Initializable: contract is not i")
                    mstore(add(memPtr, 100), "nitializing")
                    revert(memPtr, 132)
                }
                let _1 := sub(shl(160, 1), 1)
                let expr := eq(address(), _1)
                let expr_1 := expr
                if expr
                {
                    expr := eq(and(var_initialOwner, _1), _1)
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
                    expr_2 := eq(and(var_initialOwner, _1), _1)
                }
                if expr_2
                {
                    let _3 := mload(64)
                    mstore(_3, shl(224, 0x24159e5b))
                    revert(_3, 4)
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(fun_frozenPermissionHash_20160(address())))
                {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0xfda9b7e9))
                    revert(_4, sub(abi_encode_address_bytes32_20161(add(_4, 4), address()), _4))
                }
                let expr_3 := fun_permissionHash_20162(address(), var_initialOwner)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_3)), _1)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(225, 0x154c1277))
                    revert(_5, sub(abi_encode_address_address_bytes32_20163(add(_5, 4), address(), var_initialOwner), _5))
                }
                update_storage_value_offsett_address_to_address_20164(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_3))
                let _6 := mload(64)
                log4(_6, sub(abi_encode_address_contract_IPermissionOracle_20165(_6, address()), _6), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33, caller(), var_initialOwner)
                fun_grantWithOracle_20168(address(), var_initialOwner)
            }
            function modifier_auth_2405(var_release, var_pluginSetup, var_contentURI_offset, var_contentURI_length)
            {
                fun_auth(address())
                let _1 := 64
                let expr_mpos := mload(_1)
                let _2 := 0x20
                mstore(add(expr_mpos, _2), shl(224, 0x01ffc9a7))
                let _3 := sub(abi_encode_bytes4(add(expr_mpos, 36)), expr_mpos)
                mstore(expr_mpos, add(_3, not(31)))
                finalize_allocation(expr_mpos, _3)
                let var_mpos := fun_functionCallWithValue(var_pluginSetup, expr_mpos, copy_literal_to_memory_24d7ab5d382116e64324f19950ca9340b8af1ddeb09a8d026e0a3c6a01dcc9df())
                let expr := mload(var_mpos)
                let _4 := eq(expr, _2)
                let expr_1 := iszero(_4)
                if _4
                {
                    expr_1 := iszero(eq(abi_decode_uint256_fromMemory(add(var_mpos, _2), add(add(var_mpos, expr), _2)), 0x01))
                }
                if expr_1
                {
                    let _5 := mload(_1)
                    mstore(_5, shl(224, 0x811a0613))
                    revert(_5, sub(abi_encode_address(add(_5, 4), var_pluginSetup), _5))
                }
                let _6 := and(var_release, 0xff)
                if iszero(_6)
                {
                    let _7 := mload(_1)
                    mstore(_7, shl(224, 0xd7e91e79))
                    revert(_7, 4)
                }
                let _8 := sload(0x65)
                if gt(checked_sub_uint256(_6, _8), 0x01)
                {
                    let _9 := mload(_1)
                    mstore(_9, shl(224, 0xaf2dd6bb))
                    revert(_9, sub(abi_encode_uint256_uint8(add(_9, 4), _8, var_release), _9))
                }
                if gt(_6, _8)
                {
                    update_storage_value_offsett_uint256_to_uint256(_6)
                }
                let _10 := sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10144(sload(mapping_index_access_mapping_address_bytes32_of_address(var_pluginSetup))))
                let _11 := and(_10, 0xff)
                let expr_2 := iszero(iszero(_11))
                if expr_2 { expr_2 := iszero(eq(_11, _6)) }
                if expr_2
                {
                    let _12 := mload(_1)
                    mstore(_12, shl(225, 0x11791b4d))
                    revert(_12, sub(abi_encode_uint8_uint16_address(add(_12, 4), _11, and(shr(8, _10), 0xffff), var_pluginSetup), _12))
                }
                let _13 := mapping_index_access_mapping_uint256_uint256_of_uint8(var_release)
                let _14 := sload(_13)
                sstore(_13, add(_14, 0x01))
                let expr_3 := and(_14, 0xffff)
                let expr_mpos_1 := allocate_memory_10146()
                write_to_memory_uint8(expr_mpos_1, var_release)
                write_to_memory_uint16(add(expr_mpos_1, _2), expr_3)
                let expr_4 := fun_tagHash(expr_mpos_1)
                let expr_mpos_2 := allocate_memory()
                mstore(expr_mpos_2, expr_mpos_1)
                write_to_memory_address(add(expr_mpos_2, _2), var_pluginSetup)
                mstore(add(expr_mpos_2, _1), 0x00)
                mstore(add(expr_mpos_2, 96), abi_decode_available_length_bytes(var_contentURI_offset, var_contentURI_length, calldatasize()))
                copy_struct_to_storage_from_struct_Version_to_struct_Version(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10144(expr_4), expr_mpos_2)
                sstore(mapping_index_access_mapping_address_bytes32_of_address(var_pluginSetup), expr_4)
                let _15 := mload(_1)
                log2(_15, sub(abi_encode_uint8_uint16_bytes_calldata_bool(_15, var_release, expr_3, var_contentURI_offset, var_contentURI_length), _15), 0xafaf396f1c9485ff9b841f536192095630f6b0ff196923ba889b25f907b1a670, var_pluginSetup)
            }
            function abi_encode_bytes4(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, shl(224, 0x84694fb7))
            }
            function abi_decode_uint256_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                value0 := mload(headStart)
            }
            function abi_encode_address(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
            }
            function checked_sub_uint256(x, y) -> diff
            {
                if lt(x, y)
                {
                    mstore(0, shl(224, 0x4e487b71))
                    mstore(4, 0x11)
                    revert(0, 0x24)
                }
                diff := sub(x, y)
            }
            function abi_encode_uint256_uint8(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, value0)
                mstore(add(headStart, 32), and(value1, 0xff))
            }
            function update_storage_value_offsett_uint256_to_uint256(value)
            { sstore(0x65, value) }
            function mapping_index_access_mapping_address_bytes32_of_address(key) -> dataSlot
            {
                mstore(0, and(key, sub(shl(160, 1), 1)))
                mstore(0x20, 0x68)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x34)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10144(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x67)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x33)
                dataSlot := keccak256(0, 0x40)
            }
            function abi_encode_uint8_uint16_address(headStart, value0, value1, value2) -> tail
            {
                tail := add(headStart, 96)
                mstore(headStart, and(value0, 0xff))
                mstore(add(headStart, 32), and(value1, 0xffff))
                mstore(add(headStart, 64), and(value2, sub(shl(160, 1), 1)))
            }
            function mapping_index_access_mapping_uint256_uint256_of_uint8(key) -> dataSlot
            {
                mstore(0, and(key, 0xff))
                mstore(0x20, 0x66)
                dataSlot := keccak256(0, 0x40)
            }
            function write_to_memory_uint8(memPtr, value)
            {
                mstore(memPtr, and(value, 0xff))
            }
            function write_to_memory_uint16(memPtr, value)
            {
                mstore(memPtr, and(value, 0xffff))
            }
            function write_to_memory_address(memPtr, value)
            {
                mstore(memPtr, and(value, sub(shl(160, 1), 1)))
            }
            function write_to_memory_bool(memPtr, value)
            {
                mstore(memPtr, iszero(iszero(value)))
            }
            function update_storage_value_offsett_address_to_address_20164(slot)
            {
                sstore(slot, or(and(sload(slot), shl(160, 0xffffffffffffffffffffffff)), 2))
            }
            function update_storage_value_offsett_address_to_address(slot, value)
            {
                sstore(slot, or(and(sload(slot), shl(160, 0xffffffffffffffffffffffff)), and(value, sub(shl(160, 1), 1))))
            }
            function extract_byte_array_length(data) -> length
            {
                length := shr(1, data)
                let outOfPlaceEncoding := and(data, 1)
                if iszero(outOfPlaceEncoding) { length := and(length, 0x7f) }
                if eq(outOfPlaceEncoding, lt(length, 32))
                {
                    mstore(0, shl(224, 0x4e487b71))
                    mstore(4, 0x22)
                    revert(0, 0x24)
                }
            }
            function array_dataslot_bytes_storage(ptr) -> data
            {
                mstore(0, ptr)
                data := keccak256(0, 0x20)
            }
            function clean_up_bytearray_end_slots_bytes_storage(array, len, startIndex)
            {
                if gt(len, 31)
                {
                    let _1 := 0
                    mstore(_1, array)
                    let data := keccak256(_1, 0x20)
                    let deleteStart := add(data, shr(5, add(startIndex, 31)))
                    if lt(startIndex, 0x20) { deleteStart := data }
                    let _2 := add(data, shr(5, add(len, 31)))
                    let start := deleteStart
                    for { } lt(start, _2) { start := add(start, 1) }
                    { sstore(start, _1) }
                }
            }
            function extract_used_part_and_set_length_of_short_byte_array(data, len) -> used
            {
                used := or(and(data, not(shr(shl(3, len), not(0)))), shl(1, len))
            }
            function copy_byte_array_to_storage_from_bytes_to_bytes(slot, src)
            {
                let newLen := mload(src)
                if gt(newLen, 0xffffffffffffffff) { panic_error_0x41() }
                clean_up_bytearray_end_slots_bytes_storage(slot, extract_byte_array_length(sload(slot)), newLen)
                let srcOffset := 0
                let srcOffset_1 := 0x20
                srcOffset := srcOffset_1
                switch gt(newLen, 31)
                case 1 {
                    let loopEnd := and(newLen, not(31))
                    let dstPtr := array_dataslot_bytes_storage(slot)
                    let i := 0
                    for { } lt(i, loopEnd) { i := add(i, srcOffset_1) }
                    {
                        sstore(dstPtr, mload(add(src, srcOffset)))
                        dstPtr := add(dstPtr, 1)
                        srcOffset := add(srcOffset, srcOffset_1)
                    }
                    if lt(loopEnd, newLen)
                    {
                        let lastValue := mload(add(src, srcOffset))
                        sstore(dstPtr, and(lastValue, not(shr(and(shl(3, newLen), 248), not(0)))))
                    }
                    sstore(slot, add(shl(1, newLen), 1))
                }
                default {
                    let value := 0
                    if newLen
                    {
                        value := mload(add(src, srcOffset))
                    }
                    sstore(slot, extract_used_part_and_set_length_of_short_byte_array(value, newLen))
                }
            }
            function copy_struct_to_storage_from_struct_Version_to_struct_Version(slot, value)
            {
                let _1 := mload(value)
                let _2 := and(mload(_1), 0xff)
                let _3 := sload(slot)
                sstore(slot, or(and(_3, not(255)), _2))
                sstore(slot, or(or(and(_3, not(16777215)), _2), and(shl(8, mload(add(_1, 32))), 16776960)))
                let memberSlot := add(slot, 1)
                update_storage_value_offsett_address_to_address(memberSlot, and(mload(add(value, 32)), sub(shl(160, 1), 1)))
                let cleaned := iszero(iszero(mload(add(value, 64))))
                let _4 := sload(memberSlot)
                sstore(memberSlot, or(and(_4, not(shl(160, 255))), and(shl(160, cleaned), shl(160, 255))))
                copy_byte_array_to_storage_from_bytes_to_bytes(add(slot, 2), mload(add(value, 96)))
            }
            function abi_encode_uint8_uint16_bytes_calldata_bool(headStart, value0, value1, value2, value3) -> tail
            {
                mstore(headStart, and(value0, 0xff))
                mstore(add(headStart, 32), and(value1, 0xffff))
                mstore(add(headStart, 64), 128)
                mstore(add(headStart, 128), value3)
                calldatacopy(add(headStart, 160), value2, value3)
                mstore(add(add(headStart, value3), 160), 0x00)
                tail := add(add(headStart, and(add(value3, 31), not(31))), 160)
                mstore(add(headStart, 96), 0x00)
            }
            function allocate_and_zero_memory_struct_struct_Version() -> memPtr
            {
                let memPtr_1 := mload(64)
                finalize_allocation_10178(memPtr_1)
                memPtr := memPtr_1
                let memPtr_2 := mload(64)
                let newFreePtr := add(memPtr_2, 64)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr_2)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                mstore(memPtr_2, 0)
                mstore(add(memPtr_2, 32), 0)
                mstore(memPtr_1, memPtr_2)
                mstore(add(memPtr_1, 32), 0)
                mstore(add(memPtr_1, 64), 0)
                mstore(add(memPtr_1, 96), 96)
            }
            function fun_getLatestVersion(var__release) -> var_2565_mpos
            {
                pop(allocate_and_zero_memory_struct_struct_Version())
                let _1 := and(var__release, 0xff)
                mstore(0, _1)
                mstore(0x20, 0x66)
                let cleaned := and(sload(keccak256(0, 0x40)), 0xffff)
                let memPtr := mload(0x40)
                finalize_allocation_10180(memPtr)
                mstore(memPtr, _1)
                mstore(add(memPtr, 0x20), cleaned)
                var_2565_mpos := fun_getVersion(fun_tagHash(memPtr))
            }
            function fun_getLatestVersion_2602(var__pluginSetup) -> var_2593_mpos
            {
                pop(allocate_and_zero_memory_struct_struct_Version())
                mstore(0, and(var__pluginSetup, sub(shl(160, 1), 1)))
                mstore(0x20, 0x68)
                var_2593_mpos := fun_getVersion(sload(keccak256(0, 0x40)))
            }
            function fun_getVersion_2619(var_tag_offset) -> var_2610_mpos
            {
                pop(allocate_and_zero_memory_struct_struct_Version())
                if slt(sub(calldatasize(), var_tag_offset), 0x40) { revert(0, 0) }
                let memPtr := mload(0x40)
                finalize_allocation_10180(memPtr)
                let value := calldataload(var_tag_offset)
                if iszero(eq(value, and(value, 0xff))) { revert(0, 0) }
                mstore(memPtr, value)
                let value_1 := calldataload(add(var_tag_offset, 32))
                if iszero(eq(value_1, and(value_1, 0xffff))) { revert(0, 0) }
                mstore(add(memPtr, 32), value_1)
                var_2610_mpos := fun_getVersion(fun_tagHash(memPtr))
            }
            function read_from_storage_split_offset_address(slot) -> value
            {
                value := and(sload(slot), sub(shl(160, 1), 1))
            }
            function copy_array_from_storage_to_memory_bytes(slot) -> memPtr
            {
                memPtr := mload(64)
                let ret := 0
                let slotValue := sload(slot)
                let length := extract_byte_array_length(slotValue)
                mstore(memPtr, length)
                let _1 := 0x20
                let _2 := 1
                switch and(slotValue, _2)
                case 0 {
                    mstore(add(memPtr, _1), and(slotValue, not(255)))
                    ret := add(memPtr, 64)
                }
                case 1 {
                    mstore(0, slot)
                    let dataPos := keccak256(0, _1)
                    let i := 0
                    for { } lt(i, length) { i := add(i, _1) }
                    {
                        mstore(add(add(memPtr, i), _1), sload(dataPos))
                        dataPos := add(dataPos, _2)
                    }
                    ret := add(add(memPtr, i), _1)
                }
                finalize_allocation(memPtr, sub(ret, memPtr))
            }
            function fun_getVersion(var_tagHash) -> var_mpos
            {
                pop(allocate_and_zero_memory_struct_struct_Version())
                mstore(0, var_tagHash)
                mstore(0x20, 0x67)
                let dataSlot := keccak256(0, 0x40)
                let _1 := sload(dataSlot)
                let cleaned := and(_1, 0xff)
                if iszero(cleaned)
                {
                    let _2 := mload(0x40)
                    mstore(_2, shl(224, 0x8d0aeeb1))
                    mstore(add(_2, 4), var_tagHash)
                    revert(_2, 36)
                }
                let memPtr := mload(0x40)
                finalize_allocation_10178(memPtr)
                let memPtr_1 := mload(0x40)
                finalize_allocation_10180(memPtr_1)
                mstore(memPtr_1, cleaned)
                mstore(add(memPtr_1, 0x20), and(shr(8, _1), 0xffff))
                mstore(memPtr, memPtr_1)
                let _3 := sload(add(dataSlot, 1))
                mstore(add(memPtr, 0x20), and(_3, sub(shl(160, 1), 1)))
                write_to_memory_bool(add(memPtr, 0x40), and(shr(160, _3), 0xff))
                mstore(add(memPtr, 96), copy_array_from_storage_to_memory_bytes(add(dataSlot, 2)))
                var_mpos := memPtr
            }
            function fun_versionCount(var_releaseId) -> var
            {
                mstore(0, and(var_releaseId, 0xff))
                mstore(0x20, 0x66)
                var := sload(keccak256(0, 0x40))
            }
            function fun_tagHash(var_tag_mpos) -> var_
            {
                let _1 := mload(var_tag_mpos)
                let _2 := mload(add(var_tag_mpos, 32))
                let expr_2678_mpos := mload(64)
                let _3 := add(expr_2678_mpos, 32)
                mstore(_3, and(shl(248, _1), shl(248, 255)))
                mstore(add(expr_2678_mpos, 33), and(shl(240, _2), shl(240, 65535)))
                mstore(expr_2678_mpos, 3)
                finalize_allocation_20158(expr_2678_mpos)
                var_ := keccak256(_3, mload(expr_2678_mpos))
            }
            function fun_supportsInterface(var_interfaceId) -> var
            {
                let _1 := and(var_interfaceId, shl(224, 0xffffffff))
                let expr := eq(_1, shl(224, 0x51e2918f))
                if iszero(expr)
                {
                    expr := eq(_1, shl(224, 0x2b96ad4d))
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := eq(_1, shl(224, 0x01ffc9a7))
                }
                var := expr_1
            }
            function copy_literal_to_memory_24d7ab5d382116e64324f19950ca9340b8af1ddeb09a8d026e0a3c6a01dcc9df() -> memPtr
            {
                let memPtr_1 := mload(64)
                finalize_allocation_20158(memPtr_1)
                mstore(memPtr_1, 30)
                memPtr := memPtr_1
                mstore(add(memPtr_1, 32), "Address: low-level call failed")
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
            function fun_functionCallWithValue(var_target, var_data_mpos, var_errorMessage_mpos) -> var_mpos
            {
                if iszero(extcodesize(var_target))
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 29)
                    mstore(add(memPtr, 68), "Address: call to non-contract")
                    revert(memPtr, 100)
                }
                let expr_component := call(gas(), var_target, 0, add(var_data_mpos, 0x20), mload(var_data_mpos), 0, 0)
                var_mpos := fun_verifyCallResult(expr_component, extract_returndata(), var_errorMessage_mpos)
            }
            function fun_verifyCallResult(var_success, var_returndata_mpos, var_errorMessage_4577_mpos) -> var_4580_mpos
            {
                var_4580_mpos := 96
                switch var_success
                case 0 {
                    switch iszero(iszero(mload(var_returndata_mpos)))
                    case 0 {
                        let _1 := mload(64)
                        mstore(_1, shl(229, 4594637))
                        mstore(add(_1, 4), 32)
                        revert(_1, sub(abi_encode_bytes(var_errorMessage_4577_mpos, add(_1, 36)), _1))
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
                fun_auth_10193(var_where)
                fun_grantWithOracle_10224(var_where, var_who, var_permissionId)
            }
            function modifier_auth(var_where, var_who, var_permissionId, var_oracle_address)
            {
                fun_auth_10193(var_where)
                fun_grantWithOracle(var_where, var_who, var_permissionId, var_oracle_address)
            }
            function modifier_auth_5059(var_where, var_who, var_permissionId)
            {
                fun_auth_10193(var_where)
                fun_revoke(var_where, var_who, var_permissionId)
            }
            function modifier_auth_5078(var_where, var_permissionId)
            {
                fun_auth_10193(var_where)
                fun_freeze(var_where, var_permissionId)
            }
            function modifier_auth_5098(var_where, var_items_offset, var_items_5093_length)
            {
                fun_auth_10193(var_where)
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
                        fun_grantWithOracle_10224(var_where, _5, mload(add(var_item_mpos, 64)))
                    }
                    var_i := add(var_i, 1)
                }
            }
            function panic_error_0x32()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x32)
                revert(0, 0x24)
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
                    fun_auth_10193(cleanup_address(mload(_1)))
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
                        fun_grantWithOracle_10224(_12, _13, mload(add(var_item_mpos, 128)))
                    }
                    var_i := add(var_i, 1)
                }
            }
            function fun_isGranted(var_where, var_who, var_permissionId, var__data_mpos) -> var
            {
                let expr := fun__isGranted(var_where, var_who, var_permissionId, var__data_mpos)
                if iszero(expr)
                {
                    expr := fun_isGranted_10221(var_where, var_permissionId, var__data_mpos)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_10222(var_who, var_permissionId, var__data_mpos)
                }
                var := expr_1
            }
            function read_from_storage_split_offset_bool(slot) -> value
            {
                value := and(sload(slot), 0xff)
            }
            function abi_encode_address_bytes32_20161(headStart, value0) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
            }
            function abi_encode_address_bytes32_29984(headStart, value0) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
            }
            function abi_encode_address_bytes32(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), value1)
            }
            function abi_encode_address_address_bytes32_20163(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
            }
            function abi_encode_address_address_bytes32_29986(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
            }
            function abi_encode_address_address_bytes32(headStart, value0, value1, value2) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), value2)
            }
            function abi_encode_address_contract_IPermissionOracle_20165(headStart, value0) -> tail
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
            function fun_grantWithOracle_20168(var_where, var_who)
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
                    mstore(_3, shl(231, 1285445))
                    revert(_3, 4)
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(fun_frozenPermissionHash_29983(var_where)))
                {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0xfda9b7e9))
                    revert(_4, sub(abi_encode_address_bytes32_29984(add(_4, 4), var_where), _4))
                }
                let expr_3 := fun_permissionHash_29985(var_where, var_who)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_3)), _1)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(225, 0x154c1277))
                    revert(_5, sub(abi_encode_address_address_bytes32_29986(add(_5, 4), var_where, var_who), _5))
                }
                update_storage_value_offsett_address_to_address_20164(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_3))
                let _6 := mload(64)
                log4(_6, sub(abi_encode_address_contract_IPermissionOracle_20165(_6, var_where), _6), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd, caller(), var_who)
            }
            function fun_grantWithOracle_10224(var_where, var_who, var_permissionId)
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
                    let expr_3 := eq(var_permissionId, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                    if iszero(expr_3) { expr_3 := 0x00 }
                    if expr_3
                    {
                        let _3 := mload(64)
                        mstore(_3, shl(224, 0x24159e5b))
                        revert(_3, 4)
                    }
                    let _4 := mload(64)
                    mstore(_4, shl(231, 1285445))
                    revert(_4, 4)
                }
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_bytes32(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_4 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_4)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_address_to_address_20164(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_4))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle_20165(_7, var_where), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
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
                    let expr_3 := eq(var_permissionId, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                    if iszero(expr_3) { expr_3 := 0x00 }
                    if expr_3
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
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_bytes32(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_4 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_4)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_address_to_address(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr_4), and(var_oracle_5378_address, _1))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle(_7, var_where, var_oracle_5378_address), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
            }
            function fun_revoke(var_where, var_who, var_permissionId)
            {
                mstore(0, fun_frozenPermissionHash(var_where, var_permissionId))
                mstore(0x20, 0x34)
                if and(sload(keccak256(0, 0x40)), 0xff)
                {
                    let _1 := mload(0x40)
                    mstore(_1, shl(224, 0xfda9b7e9))
                    revert(_1, sub(abi_encode_address_bytes32(add(_1, 4), var_where, var_permissionId), _1))
                }
                let expr := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr)), sub(shl(160, 1), 1)))
                {
                    let _2 := mload(0x40)
                    mstore(_2, shl(225, 0x15845b1d))
                    revert(_2, sub(abi_encode_address_address_bytes32(add(_2, 4), var_where, var_who, var_permissionId), _2))
                }
                let _3 := mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(expr)
                sstore(_3, and(sload(_3), shl(160, 0xffffffffffffffffffffffff)))
                let _4 := mload(0x40)
                log4(_4, sub(abi_encode_address(_4, var_where), _4), 0x3ca48185ec3f6e47e24db18b13f1c65b1ce05da1659f9c1c4fe717dda5f67524, var_permissionId, caller(), var_who)
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
                mstore(0x20, 0x34)
                if and(sload(keccak256(0, 0x40)), 0xff)
                {
                    let _4 := mload(0x40)
                    mstore(_4, shl(224, 0xfda9b7e9))
                    revert(_4, sub(abi_encode_address_bytes32(add(_4, 4), var_where, var_permissionId), _4))
                }
                let _5 := mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32_10115(expr)
                sstore(_5, or(and(sload(_5), not(255)), 0x01))
                let _6 := mload(0x40)
                mstore(_6, _2)
                log3(_6, 0x20, 0x5bc82808e00f308181e1f2385733b7e64006e784fbe7ed607e74c16580eb6d88, var_permissionId, caller())
            }
            function abi_decode_bool_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let value := mload(headStart)
                if iszero(eq(value, iszero(iszero(value)))) { revert(0, 0) }
                value0 := value
            }
            function abi_encode_address_address_bytes32_bytes_29988(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_29992(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_20178(headStart, value0, value2, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), _1)
                mstore(add(headStart, 64), value2)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_30000(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_30004(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_30008(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_20180(headStart, value1, value2, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), value2)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function abi_encode_address_address_bytes32_bytes_30020(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                mstore(add(headStart, 96), 128)
                tail := abi_encode_bytes(value3, add(headStart, 128))
            }
            function fun_isGranted_20182(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_29988(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_20188(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_29992(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_20224(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_10221(var_where, var_permissionId, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_20178(add(_3, 4), var_where, var_permissionId, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_20183(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_30000(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_20189(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_30004(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_20225(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_30008(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_10222(var_who, var_permissionId, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_20180(add(_3, 4), var_who, var_permissionId, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_20181(var_where, var_who, var_data_mpos) -> var
            {
                let _1 := sub(shl(160, 1), 1)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(fun_permissionHash_29985(var_where, var_who))), _1)
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
                mstore(add(_2, 68), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
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
            function fun_isGranted_20187(var_where, var_who, var_data_mpos) -> var
            {
                let _1 := sub(shl(160, 1), 1)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(fun_permissionHash_20162(var_where, var_who))), _1)
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
            function fun_isGranted_20223(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(keccak256(_1, mload(expr_mpos)))), sub(shl(160, 1), 1))
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_30020(add(_3, 4), var_where, var_who, var_data_mpos), _3), _3, 0x20)
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
            function fun__isGranted(var__where, var_who, var_permissionId, var_data_5593_mpos) -> var
            {
                let _1 := sub(shl(160, 1), 1)
                let value := and(sload(mapping_index_access_mapping_bytes32_struct_Version_storage_of_bytes32(fun_permissionHash(var__where, var_who, var_permissionId))), _1)
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
                mstore(add(_2, 4), and(var__where, _1))
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
                let _1 := abi_decode_available_length_bytes_10234(calldatasize(), calldatasize())
                let expr := fun_isGranted_20181(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_20182(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_20183(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10234(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_20181(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_20182(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_20183(caller(), _2)
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
                    mstore(add(_3, 100), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                    revert(_3, 132)
                }
            }
            function fun_auth_10193(var_where)
            {
                let _1 := abi_decode_available_length_bytes_10234(calldatasize(), calldatasize())
                let expr := fun_isGranted_20187(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_20188(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_20189(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10234(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_20187(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_20188(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_20189(caller(), _2)
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
            function fun_auth_10236(var_where)
            {
                let _1 := abi_decode_available_length_bytes_10234(calldatasize(), calldatasize())
                let expr := fun_isGranted_20223(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_20224(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_20225(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes_10234(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_20223(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_20224(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_20225(caller(), _2)
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
                    mstore(add(_3, 100), 0x5aa4f06bdc18535eff05128093a2315c2c960a2722e20021cbff28da04760f5b)
                    revert(_3, 132)
                }
            }
            function fun_permissionHash_20162(var_where, var_who) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
                var := keccak256(_1, mload(expr_mpos))
            }
            function fun_permissionHash_29985(var_where, var_who) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                mstore(expr_mpos, 82)
                finalize_allocation_10178(expr_mpos)
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
                finalize_allocation_10178(expr_5706_mpos)
                var := keccak256(_1, mload(expr_5706_mpos))
            }
            function fun_frozenPermissionHash_20160(var_where) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "IMMUTABLE")
                mstore(add(expr_mpos, 41), and(shl(96, var_where), not(0xffffffffffffffffffffffff)))
                mstore(add(expr_mpos, 61), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 61)
                finalize_allocation_20236(expr_mpos)
                var := keccak256(_1, mload(expr_mpos))
            }
            function fun_frozenPermissionHash_29983(var_where) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "IMMUTABLE")
                mstore(add(expr_mpos, 41), and(shl(96, var_where), not(0xffffffffffffffffffffffff)))
                mstore(add(expr_mpos, 61), 0xa49f10710df74c73f77df190e30f0261bc10b48204a5fe3a69bb75d970eefffd)
                mstore(expr_mpos, 61)
                finalize_allocation_20236(expr_mpos)
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
                finalize_allocation_20236(expr_5726_mpos)
                var := keccak256(_1, mload(expr_5726_mpos))
            }
            function modifier_notDelegated() -> _1
            {
                if iszero(eq(address(), and(loadimmutable("5901"), sub(shl(160, 1), 1))))
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
            function modifier_onlyProxy(var_newImplementation)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(loadimmutable("5901"), _1)
                require_helper_stringliteral_36e1(iszero(eq(address(), _2)))
                let _3 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
                require_helper_stringliteral_52f1(eq(and(sload(_3), _1), _2))
                fun_auth_10236(address())
                let memPtr := mload(64)
                finalize_allocation_20237(memPtr)
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
                        expr := abi_decode_uint256_fromMemory(_4, add(_4, returndatasize()))
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
                    fun_upgradeToAndCall_20238(var_newImplementation, memPtr)
                }
                default {
                    fun_setImplementation(var_newImplementation)
                }
            }
            function modifier_onlyProxy_5981(var_newImplementation, var_data_mpos)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(loadimmutable("5901"), _1)
                require_helper_stringliteral_36e1(iszero(eq(address(), _2)))
                let _3 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
                require_helper_stringliteral_52f1(eq(and(sload(_3), _1), _2))
                fun_auth_10236(address())
                switch and(sload(0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143), 0xff)
                case 0 {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0x52d1902d))
                    let trySuccessCondition := staticcall(gas(), and(var_newImplementation, _1), _4, 4, _4, 32)
                    let expr := 0
                    if trySuccessCondition
                    {
                        finalize_allocation(_4, returndatasize())
                        expr := abi_decode_uint256_fromMemory(_4, add(_4, returndatasize()))
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
                    fun_upgradeToAndCall(var_newImplementation, var_data_mpos)
                }
                default {
                    fun_setImplementation(var_newImplementation)
                }
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
            function fun_upgradeToAndCall_20238(var_newImplementation, var_data_mpos)
            {
                fun_setImplementation(var_newImplementation)
                let _1 := mload(64)
                log2(_1, 0, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
                let _2 := iszero(mload(var_data_mpos))
                let expr := iszero(_2)
                if _2 { expr := 0 }
                if expr
                {
                    finalize_allocation_20236(_1)
                    mstore(_1, 39)
                    mstore(add(_1, 32), "Address: low-level delegate call")
                    mstore(add(_1, 64), " failed")
                    if iszero(extcodesize(var_newImplementation))
                    {
                        let memPtr := mload(64)
                        mstore(memPtr, shl(229, 4594637))
                        mstore(add(memPtr, 4), 32)
                        mstore(add(memPtr, 36), 38)
                        mstore(add(memPtr, 68), "Address: delegate call to non-co")
                        mstore(add(memPtr, 100), "ntract")
                        revert(memPtr, 132)
                    }
                    let expr_component := delegatecall(gas(), var_newImplementation, add(var_data_mpos, 32), mload(var_data_mpos), 0, 0)
                    pop(fun_verifyCallResult(expr_component, extract_returndata(), _1))
                }
            }
            function fun_upgradeToAndCall(var_newImplementation, var_data_mpos)
            {
                fun_setImplementation(var_newImplementation)
                let _1 := mload(64)
                log2(_1, 0, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
                let _2 := iszero(mload(var_data_mpos))
                let expr := iszero(_2)
                if _2 { expr := 0x01 }
                if expr
                {
                    finalize_allocation_20236(_1)
                    mstore(_1, 39)
                    mstore(add(_1, 32), "Address: low-level delegate call")
                    mstore(add(_1, 64), " failed")
                    if iszero(extcodesize(var_newImplementation))
                    {
                        let memPtr := mload(64)
                        mstore(memPtr, shl(229, 4594637))
                        mstore(add(memPtr, 4), 32)
                        mstore(add(memPtr, 36), 38)
                        mstore(add(memPtr, 68), "Address: delegate call to non-co")
                        mstore(add(memPtr, 100), "ntract")
                        revert(memPtr, 132)
                    }
                    let expr_component := delegatecall(gas(), var_newImplementation, add(var_data_mpos, 32), mload(var_data_mpos), 0, 0)
                    pop(fun_verifyCallResult(expr_component, extract_returndata(), _1))
                }
            }
        }
        data ".metadata" hex"a3646970667358221220f822f3ecb45aff3f20d10543ee65aa49545e0266fbdd4d2eaa9cfa4d2884f7d16c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
