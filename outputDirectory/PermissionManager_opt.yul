/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 54:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionManager.sol"
object "PermissionManager_5750" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let _2 := datasize("PermissionManager_5750_deployed")
            codecopy(_1, dataoffset("PermissionManager_5750_deployed"), _2)
            return(_1, _2)
        }
    }
    /// @use-src 54:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/permission/PermissionManager.sol"
    object "PermissionManager_5750_deployed" {
        code {
            {
                let _1 := memoryguard(0x80)
                let _2 := 64
                mstore(_2, _1)
                if iszero(lt(calldatasize(), 4))
                {
                    let _3 := 0
                    switch shr(224, calldataload(_3))
                    case 0x09e56b14 {
                        if callvalue() { revert(_3, _3) }
                        abi_decode(calldatasize())
                        return(_1, sub(abi_encode_bytes32(_1), _1))
                    }
                    case 0x1f3966d8 {
                        if callvalue() { revert(_3, _3) }
                        let param, param_1, param_2 := abi_decode_addresst_array_struct_ItemSingleTarget_calldata_dyn_calldata(calldatasize())
                        modifier_auth_5098(param, param_1, param_2)
                        return(mload(_2), _3)
                    }
                    case 0x2675fdd0 {
                        if callvalue() { revert(_3, _3) }
                        let param_3, param_4, param_5, param_6 := abi_decode_addresst_addresst_bytes32t_bytes(calldatasize())
                        let ret := fun_isGranted(param_3, param_4, param_5, param_6)
                        let memPos := mload(_2)
                        return(memPos, sub(abi_encode_bool(memPos, ret), memPos))
                    }
                    case 0x4a12e253 {
                        if callvalue() { revert(_3, _3) }
                        let param_7, param_8 := abi_decode_addresst_bytes32(calldatasize())
                        modifier_auth_5078(param_7, param_8)
                        return(mload(_2), _3)
                    }
                    case 0x628bb478 {
                        if callvalue() { revert(_3, _3) }
                        let param_9, param_10 := abi_decode_addresst_bytes32(calldatasize())
                        let ret_1 := read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_3265(fun_frozenPermissionHash(param_9, param_10)))
                        let memPos_1 := mload(_2)
                        return(memPos_1, sub(abi_encode_bool(memPos_1, ret_1), memPos_1))
                    }
                    case 0xb4276a87 {
                        if callvalue() { revert(_3, _3) }
                        let param_11, param_12 := abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(calldatasize())
                        fun_bulkOnMultiTarget(param_11, param_12)
                        return(mload(_2), _3)
                    }
                    case 0xce43e4e0 {
                        if callvalue() { revert(_3, _3) }
                        let param_13, param_14, param_15, param_16 := abi_decode_addresst_addresst_bytes32t_contract_IPermissionOracle(calldatasize())
                        modifier_auth(param_13, param_14, param_15, param_16)
                        return(mload(_2), _3)
                    }
                    case 0xd68bad2c {
                        if callvalue() { revert(_3, _3) }
                        let param_17, param_18, param_19 := abi_decode_addresst_addresst_bytes32(calldatasize())
                        modifier_auth_5013(param_17, param_18, param_19)
                        return(mload(_2), _3)
                    }
                    case 0xd96054c4 {
                        if callvalue() { revert(_3, _3) }
                        let param_20, param_21, param_22 := abi_decode_addresst_addresst_bytes32(calldatasize())
                        modifier_auth_5059(param_20, param_21, param_22)
                        return(mload(_2), _3)
                    }
                }
                revert(0, 0)
            }
            function abi_decode(dataEnd)
            {
                if slt(add(dataEnd, not(3)), 0) { revert(0, 0) }
            }
            function abi_encode_bytes32(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
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
            function finalize_allocation_7579(memPtr)
            {
                let newFreePtr := add(memPtr, 128)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation(memPtr, size)
            {
                let newFreePtr := add(memPtr, and(add(size, 31), not(31)))
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function abi_decode_available_length_bytes(length, end) -> array
            {
                if gt(length, 0xffffffffffffffff) { panic_error_0x41() }
                let memPtr := mload(64)
                finalize_allocation(memPtr, add(and(add(length, 31), not(31)), 0x20))
                array := memPtr
                mstore(memPtr, length)
                if gt(length, end) { revert(0, 0) }
                calldatacopy(add(memPtr, 0x20), 0, length)
                mstore(add(add(memPtr, length), 0x20), 0)
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
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                let _2 := calldataload(add(4, offset))
                if gt(_2, _1) { panic_error_0x41() }
                let memPtr := mload(64)
                finalize_allocation(memPtr, add(and(add(_2, 31), not(31)), 0x20))
                mstore(memPtr, _2)
                if gt(add(add(offset, _2), 36), dataEnd) { revert(0, 0) }
                calldatacopy(add(memPtr, 0x20), add(offset, 36), _2)
                mstore(add(add(memPtr, _2), 0x20), 0)
                value3 := memPtr
            }
            function abi_encode_bool(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, iszero(iszero(value0)))
            }
            function abi_decode_addresst_bytes32(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                value1 := calldataload(36)
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
            function modifier_auth_5013(var_where, var_who, var_permissionId)
            {
                fun_auth(var_where)
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
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_3265(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_bytes32(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_4 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_4)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_address_to_address_7533(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_4))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle_7534(_7, var_where), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
            }
            function modifier_auth(var_where, var_who, var_permissionId, var_oracle_address)
            {
                fun_auth(var_where)
                fun_grantWithOracle(var_where, var_who, var_permissionId, var_oracle_address)
            }
            function modifier_auth_5059(var_where, var_who, var_permissionId)
            {
                fun_auth(var_where)
                fun_revoke(var_where, var_who, var_permissionId)
            }
            function modifier_auth_5078(var_where, var_permissionId)
            {
                fun_auth(var_where)
                fun_freeze(var_where, var_permissionId)
            }
            function modifier_auth_5098(var_where, var_items_offset, var_items_5093_length)
            {
                fun_auth(var_where)
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
                        fun_grantWithOracle_3300(var_where, _5, mload(add(var_item_mpos, 64)))
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
                    fun_auth(cleanup_address(mload(_1)))
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
                        fun_grantWithOracle_3300(_12, _13, mload(add(var_item_mpos, 128)))
                    }
                    var_i := add(var_i, 1)
                }
            }
            function fun_isGranted(var_where, var_who, var_permissionId, var_data_mpos) -> var
            {
                let expr := fun__isGranted(var_where, var_who, var_permissionId, var_data_mpos)
                if iszero(expr)
                {
                    expr := fun_isGranted_3298(var_where, var_permissionId, var_data_mpos)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_3299(var_who, var_permissionId, var_data_mpos)
                }
                var := expr_1
            }
            function mapping_index_access_mapping_bytes32_bool_of_bytes32_3265(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x02)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_bool_of_bytes32(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x01)
                dataSlot := keccak256(0, 0x40)
            }
            function read_from_storage_split_offset_bool(slot) -> value
            {
                value := and(sload(slot), 0xff)
            }
            function abi_encode_address_bytes32(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), value1)
            }
            function read_from_storage_split_offset_address(slot) -> value
            {
                value := and(sload(slot), sub(shl(160, 1), 1))
            }
            function abi_encode_address_address_bytes32(headStart, value0, value1, value2) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), value2)
            }
            function update_storage_value_offsett_address_to_address_7533(slot)
            {
                sstore(slot, or(and(sload(slot), shl(160, 0xffffffffffffffffffffffff)), 2))
            }
            function update_storage_value_offsett_address_to_address(slot, value)
            {
                sstore(slot, or(and(sload(slot), shl(160, 0xffffffffffffffffffffffff)), and(value, sub(shl(160, 1), 1))))
            }
            function abi_encode_address_contract_IPermissionOracle_7534(headStart, value0) -> tail
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
            function fun_grantWithOracle_3300(var_where, var_who, var_permissionId)
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
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_3265(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_bytes32(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_4 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_4)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_address_to_address_7533(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_4))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle_7534(_7, var_where), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
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
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bool_of_bytes32_3265(fun_frozenPermissionHash(var_where, var_permissionId)))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0xfda9b7e9))
                    revert(_5, sub(abi_encode_address_bytes32(add(_5, 4), var_where, var_permissionId), _5))
                }
                let expr_4 := fun_permissionHash(var_where, var_who, var_permissionId)
                if iszero(iszero(and(read_from_storage_split_offset_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_4)), _1)))
                {
                    let _6 := mload(64)
                    mstore(_6, shl(225, 0x154c1277))
                    revert(_6, sub(abi_encode_address_address_bytes32(add(_6, 4), var_where, var_who, var_permissionId), _6))
                }
                update_storage_value_offsett_address_to_address(mapping_index_access_mapping_bytes32_bool_of_bytes32(expr_4), and(var_oracle_5378_address, _1))
                let _7 := mload(64)
                log4(_7, sub(abi_encode_address_contract_IPermissionOracle(_7, var_where, var_oracle_5378_address), _7), 0x0f579ad49235a8c1fd9041427e7067b1eb10926bbed380bf6fabc73e0e807644, var_permissionId, caller(), var_who)
            }
            function abi_encode_address(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
            }
            function fun_revoke(var_where, var_who, var_permissionId)
            {
                mstore(0, fun_frozenPermissionHash(var_where, var_permissionId))
                mstore(0x20, 0x02)
                if and(sload(keccak256(0, 0x40)), 0xff)
                {
                    let _1 := mload(0x40)
                    mstore(_1, shl(224, 0xfda9b7e9))
                    revert(_1, sub(abi_encode_address_bytes32(add(_1, 4), var_where, var_permissionId), _1))
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
                mstore(0x20, 0x02)
                if and(sload(keccak256(0, 0x40)), 0xff)
                {
                    let _4 := mload(0x40)
                    mstore(_4, shl(224, 0xfda9b7e9))
                    revert(_4, sub(abi_encode_address_bytes32(add(_4, 4), var_where, var_permissionId), _4))
                }
                let _5 := mapping_index_access_mapping_bytes32_bool_of_bytes32_3265(expr)
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
            function abi_encode_address_address_bytes32_bytes_12687(headStart, value0, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                let _2 := 32
                mstore(add(headStart, _2), _1)
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                let length := mload(value3)
                mstore(add(headStart, 128), length)
                let i := 0
                for { } lt(i, length) { i := add(i, _2) }
                {
                    mstore(add(add(headStart, i), 160), mload(add(add(value3, i), _2)))
                }
                if gt(i, length)
                {
                    mstore(add(add(headStart, length), 160), 0)
                }
                tail := add(add(headStart, and(add(length, 31), not(31))), 160)
            }
            function abi_encode_address_address_bytes32_bytes_7540(headStart, value0, value2, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                let _2 := 32
                mstore(add(headStart, _2), _1)
                mstore(add(headStart, 64), value2)
                mstore(add(headStart, 96), 128)
                let length := mload(value3)
                mstore(add(headStart, 128), length)
                let i := 0
                for { } lt(i, length) { i := add(i, _2) }
                {
                    mstore(add(add(headStart, i), 160), mload(add(add(value3, i), _2)))
                }
                if gt(i, length)
                {
                    mstore(add(add(headStart, length), 160), 0)
                }
                tail := add(add(headStart, and(add(length, 31), not(31))), 160)
            }
            function abi_encode_address_address_bytes32_bytes_12691(headStart, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                let _2 := 32
                mstore(add(headStart, _2), and(value1, _1))
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                let length := mload(value3)
                mstore(add(headStart, 128), length)
                let i := 0
                for { } lt(i, length) { i := add(i, _2) }
                {
                    mstore(add(add(headStart, i), 160), mload(add(add(value3, i), _2)))
                }
                if gt(i, length)
                {
                    mstore(add(add(headStart, length), 160), 0)
                }
                tail := add(add(headStart, and(add(length, 31), not(31))), 160)
            }
            function abi_encode_address_address_bytes32_bytes_7542(headStart, value1, value2, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, _1)
                let _2 := 32
                mstore(add(headStart, _2), and(value1, _1))
                mstore(add(headStart, 64), value2)
                mstore(add(headStart, 96), 128)
                let length := mload(value3)
                mstore(add(headStart, 128), length)
                let i := 0
                for { } lt(i, length) { i := add(i, _2) }
                {
                    mstore(add(add(headStart, i), 160), mload(add(add(value3, i), _2)))
                }
                if gt(i, length)
                {
                    mstore(add(add(headStart, length), 160), 0)
                }
                tail := add(add(headStart, and(add(length, 31), not(31))), 160)
            }
            function abi_encode_address_address_bytes32_bytes(headStart, value0, value1, value3) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                let _2 := 32
                mstore(add(headStart, _2), and(value1, _1))
                mstore(add(headStart, 64), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(add(headStart, 96), 128)
                let length := mload(value3)
                mstore(add(headStart, 128), length)
                let i := 0
                for { } lt(i, length) { i := add(i, _2) }
                {
                    mstore(add(add(headStart, i), 160), mload(add(add(value3, i), _2)))
                }
                if gt(i, length)
                {
                    mstore(add(add(headStart, length), 160), 0)
                }
                tail := add(add(headStart, and(add(length, 31), not(31))), 160)
            }
            function fun_isGranted_7544(var_where, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_7579(expr_mpos)
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_12687(add(_3, 4), var_where, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_3298(var_where, var_permissionId, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), _2)
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_7579(expr_mpos)
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_7540(add(_3, 4), var_where, var_permissionId, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_7545(var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_7579(expr_mpos)
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_12691(add(_3, 4), var_who, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_3299(var_who, var_permissionId, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), _2)
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_7579(expr_mpos)
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
                let trySuccessCondition := staticcall(gas(), value, _3, sub(abi_encode_address_address_bytes32_bytes_7542(add(_3, 4), var_who, var_permissionId, var_data_mpos), _3), _3, 0x20)
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
            function fun_isGranted_7543(var_where, var_who, var_data_mpos) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), 0x815fe80e4b37c8582a3b773d1d7071f983eacfd56b5965db654f3087c25ada33)
                mstore(expr_mpos, 82)
                finalize_allocation_7579(expr_mpos)
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
            function fun__isGranted(var__where, var_who, var_permissionId, var__data_mpos) -> var
            {
                let _1 := sub(shl(160, 1), 1)
                let value := and(sload(mapping_index_access_mapping_bytes32_bool_of_bytes32(fun_permissionHash(var__where, var_who, var_permissionId))), _1)
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
                let length := mload(var__data_mpos)
                mstore(add(_2, 132), length)
                let i := 0
                for { } lt(i, length) { i := add(i, 32) }
                {
                    mstore(add(add(_2, i), 164), mload(add(add(var__data_mpos, i), 32)))
                }
                if gt(i, length)
                {
                    mstore(add(add(_2, length), 164), 0)
                }
                let trySuccessCondition := staticcall(gas(), value, _2, add(sub(add(_2, and(add(length, 31), not(31))), _2), 164), _2, 32)
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
                let _1 := abi_decode_available_length_bytes(calldatasize(), calldatasize())
                let expr := fun_isGranted_7543(var_where, caller(), _1)
                if iszero(expr)
                {
                    expr := fun_isGranted_7544(var_where, _1)
                }
                let expr_1 := expr
                if iszero(expr)
                {
                    expr_1 := fun_isGranted_7545(caller(), _1)
                }
                let expr_2 := expr_1
                if iszero(expr_1)
                {
                    let _2 := abi_decode_available_length_bytes(calldatasize(), calldatasize())
                    let expr_3 := fun_isGranted_7543(address(), caller(), _2)
                    if iszero(expr_3)
                    {
                        expr_3 := fun_isGranted_7544(address(), _2)
                    }
                    let expr_4 := expr_3
                    if iszero(expr_3)
                    {
                        expr_4 := fun_isGranted_7545(caller(), _2)
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
            function fun_permissionHash(var_where, var_who, var_permissionId) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, "PERMISSION")
                let _2 := not(0xffffffffffffffffffffffff)
                mstore(add(expr_mpos, 42), and(shl(96, var_who), _2))
                mstore(add(expr_mpos, 62), and(shl(96, var_where), _2))
                mstore(add(expr_mpos, 82), var_permissionId)
                mstore(expr_mpos, 82)
                finalize_allocation_7579(expr_mpos)
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
                let newFreePtr := add(expr_5726_mpos, 96)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, expr_5726_mpos)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                var := keccak256(_1, mload(expr_5726_mpos))
            }
        }
        data ".metadata" hex"a3646970667358221220af3fd207fae0d519c272acad1e39c2b8bf5a77095cb9808fc41f4b69f6b7f41e6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
