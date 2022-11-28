/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 40:"@openzeppelin/contracts/utils/Context.sol", 48:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/DaoAuthorizable.sol", 50:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/bases/DaoAuthorizableBase.sol", 61:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/plugin/PluginSetupProcessor.sol"
object "PluginSetupProcessor_1217" {
    code {
        {
            let _1 := memoryguard(0x80)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            let programSize := datasize("PluginSetupProcessor_1217")
            let argSize := sub(codesize(), programSize)
            let newFreePtr := add(_1, and(add(argSize, 31), not(31)))
            if or(gt(newFreePtr, sub(shl(64, 1), 1)), lt(newFreePtr, _1))
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x41)
                revert(0, 0x24)
            }
            mstore(64, newFreePtr)
            codecopy(_1, programSize, argSize)
            if slt(sub(add(_1, argSize), _1), 64) { revert(0, 0) }
            let value := mload(_1)
            validator_revert_contract_IDAO(value)
            let value_1 := mload(add(_1, 32))
            validator_revert_contract_IDAO(value_1)
            constructor_PluginSetupProcessor(value, value_1)
            let _2 := mload(64)
            let _3 := datasize("PluginSetupProcessor_1217_deployed")
            codecopy(_2, dataoffset("PluginSetupProcessor_1217_deployed"), _3)
            return(_2, _3)
        }
        function validator_revert_contract_IDAO(value)
        {
            if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
        }
        function constructor_PluginSetupProcessor(var_managingDao_address, var_repoRegistry_address)
        {
            let _1 := sub(shl(160, 1), 1)
            let _2 := not(sub(shl(160, 1), 1))
            sstore(0x00, or(and(sload(0x00), _2), and(var_managingDao_address, _1)))
            sstore(0x06, or(and(sload(0x06), _2), and(var_repoRegistry_address, _1)))
        }
    }
    /// @use-src 43:"@openzeppelin/contracts/utils/introspection/ERC165Checker.sol", 50:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/bases/DaoAuthorizableBase.sol", 61:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/plugin/PluginSetupProcessor.sol"
    object "PluginSetupProcessor_1217_deployed" {
        code {
            {
                let _1 := 64
                mstore(_1, memoryguard(0x80))
                if iszero(lt(calldatasize(), 4))
                {
                    let _2 := 0
                    switch shr(224, calldataload(_2))
                    case 0x0a5e7f79 {
                        if callvalue() { revert(_2, _2) }
                        let param, param_1, param_2, param_3 := abi_decode_addresst_struct_Tag_calldatat_contract_PluginRepot_bytes(calldatasize())
                        let ret, ret_1, ret_2 := fun_prepareInstallation(param, param_1, param_2, param_3)
                        let memPos := mload(_1)
                        return(memPos, sub(abi_encode_address_array_address_dyn_array_struct_ItemMultiTarget_dyn(memPos, ret, ret_1, ret_2), memPos))
                    }
                    case 0x192ca9dd {
                        if callvalue() { revert(_2, _2) }
                        let param_4, param_5, param_6, param_7, param_8, param_9, param_10, param_11 := abi_decode_addresst_addresst_struct_Tag_calldatat_contract_PluginRepot_array_address_dyn_calldatat_bytes_calldata(calldatasize())
                        let ret_3 := fun_prepareUninstallation(param_4, param_5, param_6, param_7, param_8, param_9)
                        let memPos_1 := mload(_1)
                        return(memPos_1, sub(abi_encode_array_struct_ItemMultiTarget_dyn(memPos_1, ret_3), memPos_1))
                    }
                    case 0x2077a1fd {
                        if callvalue() { revert(_2, _2) }
                        let param_12, param_13, param_14, param_15, param_16, param_17, param_18 := abi_decode_addresst_addresst_struct_Tag_calldatat_contract_PluginRepot_bytest_array_struct_ItemMultiTarget_calldata_dyn_calldata(calldatasize())
                        modifier_canApply_749(param_12, param_13, param_14, param_15, param_16, param_17, param_18)
                        return(mload(_1), _2)
                    }
                    case 0x483d209e {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_7711(calldatasize())
                        let ret_4 := and(sload(6), sub(shl(160, 1), 1))
                        let memPos_2 := mload(_1)
                        return(memPos_2, sub(abi_encode_contract_PluginRepoRegistry(memPos_2, ret_4), memPos_2))
                    }
                    case 0x725d092d {
                        if callvalue() { revert(_2, _2) }
                        let param_19, param_20, param_21, param_22, param_23 := abi_decode_addresst_struct_PluginUpdateParams_calldatat_array_address_dyn_calldatat_bytes(calldatasize())
                        let ret_5, ret_6 := fun_prepareUpdate(param_19, param_20, param_21, param_22, param_23)
                        let memPos_3 := mload(_1)
                        return(memPos_3, sub(abi_encode_array_struct_ItemMultiTarget_dyn_bytes(memPos_3, ret_5, ret_6), memPos_3))
                    }
                    case 0x747e5ec1 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_7711(calldatasize())
                        let memPos_4 := mload(_1)
                        return(memPos_4, sub(abi_encode_bytes32(memPos_4), memPos_4))
                    }
                    case 0x9665861a {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_7711(calldatasize())
                        let memPos_5 := mload(_1)
                        return(memPos_5, sub(abi_encode_tuple_bytes32(memPos_5), memPos_5))
                    }
                    case 0x985da726 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_7711(calldatasize())
                        let ret_7 := and(sload(_2), sub(shl(160, 1), 1))
                        let memPos_6 := mload(_1)
                        return(memPos_6, sub(abi_encode_contract_PluginRepoRegistry(memPos_6, ret_7), memPos_6))
                    }
                    case 0xb226d25e {
                        if callvalue() { revert(_2, _2) }
                        let param_24, param_25, param_26, param_27, param_28, param_29, param_30, param_31 := abi_decode_addresst_addresst_struct_Tag_calldatat_contract_PluginRepot_array_address_dyn_calldatat_array_struct_ItemMultiTarget_calldata_dyn_calldata(calldatasize())
                        modifier_canApply(param_24, param_25, param_26, param_27, param_28, param_29, param_30, param_31)
                        return(mload(_1), _2)
                    }
                    case 0xca211f7f {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_7711(calldatasize())
                        let memPos_7 := mload(_1)
                        return(memPos_7, sub(abi_encode_bytes32_7722(memPos_7), memPos_7))
                    }
                    case 0xf7f8961a {
                        if callvalue() { revert(_2, _2) }
                        let param_32, param_33, param_34, param_35, param_36, param_37 := abi_decode_addresst_struct_Tag_calldatat_contract_PluginRepot_addresst_array_struct_ItemMultiTarget_calldata_dyn_calldata(calldatasize())
                        modifier_canApply_396(param_32, param_33, param_34, param_35, param_36, param_37)
                        return(mload(_1), _2)
                    }
                }
                revert(0, 0)
            }
            function cleanup_address(value) -> cleaned
            {
                cleaned := and(value, sub(shl(160, 1), 1))
            }
            function validator_revert_address(value)
            {
                if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
            }
            function abi_decode_struct_Tag_calldata(end) -> value
            {
                if slt(add(end, not(67)), 64) { revert(0, 0) }
                value := 68
            }
            function panic_error_0x41()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x41)
                revert(0, 0x24)
            }
            function finalize_allocation_7727(memPtr)
            {
                let newFreePtr := add(memPtr, 0x80)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_7728(memPtr)
            {
                let newFreePtr := add(memPtr, 64)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_7731(memPtr)
            {
                let newFreePtr := add(memPtr, 0xa0)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_13799(memPtr)
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
            function abi_decode_bytes(offset, end) -> array
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                let _1 := calldataload(offset)
                let _2 := array_allocation_size_bytes(_1)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _2)
                mstore(memPtr, _1)
                if gt(add(add(offset, _1), 0x20), end) { revert(0, 0) }
                calldatacopy(add(memPtr, 0x20), add(offset, 0x20), _1)
                mstore(add(add(memPtr, _1), 0x20), 0)
                array := memPtr
            }
            function abi_decode_addresst_struct_Tag_calldatat_contract_PluginRepot_bytes(dataEnd) -> value0, value1, value2, value3
            {
                if slt(add(dataEnd, not(3)), 160) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                if slt(add(dataEnd, not(35)), 64) { revert(0, 0) }
                value1 := 36
                let value_1 := calldataload(100)
                validator_revert_address(value_1)
                value2 := value_1
                let offset := calldataload(132)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                value3 := abi_decode_bytes(add(4, offset), dataEnd)
            }
            function abi_encode_array_address_dyn(value, pos) -> end
            {
                let length := mload(value)
                mstore(pos, length)
                let _1 := 0x20
                pos := add(pos, _1)
                let srcPtr := add(value, _1)
                let i := 0
                for { } lt(i, length) { i := add(i, 1) }
                {
                    mstore(pos, and(mload(srcPtr), sub(shl(160, 1), 1)))
                    pos := add(pos, _1)
                    srcPtr := add(srcPtr, _1)
                }
                end := pos
            }
            function panic_error_0x21()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x21)
                revert(0, 0x24)
            }
            function abi_encode_enum_Operation(value, pos)
            {
                if iszero(lt(value, 4)) { panic_error_0x21() }
                mstore(pos, value)
            }
            function abi_encode_array_struct_ItemMultiTarget_dyn_7776(pos) -> end
            {
                let _1 := 96
                let length := mload(_1)
                mstore(pos, length)
                let _2 := 0x20
                pos := add(pos, _2)
                let srcPtr := 128
                let srcPtr_1 := srcPtr
                let i := 0
                for { } lt(i, length) { i := add(i, 1) }
                {
                    let _3 := mload(srcPtr_1)
                    abi_encode_enum_Operation(mload(_3), pos)
                    let memberValue0 := mload(add(_3, _2))
                    let _4 := sub(shl(160, 1), 1)
                    mstore(add(pos, _2), and(memberValue0, _4))
                    let _5 := 0x40
                    mstore(add(pos, _5), and(mload(add(_3, _5)), _4))
                    mstore(add(pos, _1), and(mload(add(_3, _1)), _4))
                    mstore(add(pos, srcPtr), mload(add(_3, srcPtr)))
                    pos := add(pos, 0xa0)
                    srcPtr_1 := add(srcPtr_1, _2)
                }
                end := pos
            }
            function abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(value, pos) -> end
            {
                let length := mload(value)
                mstore(pos, length)
                let _1 := 0x20
                pos := add(pos, _1)
                let srcPtr := add(value, _1)
                let i := 0
                for { } lt(i, length) { i := add(i, 1) }
                {
                    let _2 := mload(srcPtr)
                    abi_encode_enum_Operation(mload(_2), pos)
                    let memberValue0 := mload(add(_2, _1))
                    let _3 := sub(shl(160, 1), 1)
                    mstore(add(pos, _1), and(memberValue0, _3))
                    let _4 := 0x40
                    mstore(add(pos, _4), and(mload(add(_2, _4)), _3))
                    let _5 := 0x60
                    mstore(add(pos, _5), and(mload(add(_2, _5)), _3))
                    let _6 := 0x80
                    mstore(add(pos, _6), mload(add(_2, _6)))
                    pos := add(pos, 0xa0)
                    srcPtr := add(srcPtr, _1)
                }
                end := pos
            }
            function abi_encode_address_array_address_dyn_array_struct_ItemMultiTarget_dyn(headStart, value0, value1, value2) -> tail
            {
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), 96)
                let tail_1 := abi_encode_array_address_dyn(value1, add(headStart, 96))
                mstore(add(headStart, 64), sub(tail_1, headStart))
                tail := abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(value2, tail_1)
            }
            function abi_decode_array_address_dyn_calldata(offset, end) -> arrayPos, length
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                length := calldataload(offset)
                if gt(length, 0xffffffffffffffff) { revert(0, 0) }
                arrayPos := add(offset, 0x20)
                if gt(add(add(offset, shl(5, length)), 0x20), end) { revert(0, 0) }
            }
            function abi_decode_addresst_addresst_struct_Tag_calldatat_contract_PluginRepot_array_address_dyn_calldatat_bytes_calldata(dataEnd) -> value0, value1, value2, value3, value4, value5, value6, value7
            {
                if slt(add(dataEnd, not(3)), 224) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                value2 := abi_decode_struct_Tag_calldata(dataEnd)
                let value_2 := calldataload(132)
                validator_revert_address(value_2)
                value3 := value_2
                let offset := calldataload(164)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                let value4_1, value5_1 := abi_decode_array_address_dyn_calldata(add(4, offset), dataEnd)
                value4 := value4_1
                value5 := value5_1
                let offset_1 := calldataload(196)
                if gt(offset_1, _1) { revert(0, 0) }
                if iszero(slt(add(offset_1, 35), dataEnd)) { revert(0, 0) }
                let length := calldataload(add(4, offset_1))
                if gt(length, _1) { revert(0, 0) }
                if gt(add(add(offset_1, length), 36), dataEnd) { revert(0, 0) }
                value6 := add(offset_1, 36)
                value7 := length
            }
            function abi_encode_array_struct_ItemMultiTarget_dyn(headStart, value0) -> tail
            {
                mstore(headStart, 32)
                tail := abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(value0, add(headStart, 32))
            }
            function abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(offset, end) -> arrayPos, length
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                length := calldataload(offset)
                if gt(length, 0xffffffffffffffff) { revert(0, 0) }
                arrayPos := add(offset, 0x20)
                if gt(add(add(offset, mul(length, 0xa0)), 0x20), end) { revert(0, 0) }
            }
            function abi_decode_addresst_addresst_struct_Tag_calldatat_contract_PluginRepot_bytest_array_struct_ItemMultiTarget_calldata_dyn_calldata(dataEnd) -> value0, value1, value2, value3, value4, value5, value6
            {
                if slt(add(dataEnd, not(3)), 224) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                if slt(add(dataEnd, not(67)), 64) { revert(0, 0) }
                value2 := 68
                let value_2 := calldataload(132)
                validator_revert_address(value_2)
                value3 := value_2
                let offset := calldataload(164)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                value4 := abi_decode_bytes(add(4, offset), dataEnd)
                let offset_1 := calldataload(196)
                if gt(offset_1, _1) { revert(0, 0) }
                let value5_1, value6_1 := abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(add(4, offset_1), dataEnd)
                value5 := value5_1
                value6 := value6_1
            }
            function abi_decode_7711(dataEnd)
            {
                if slt(add(dataEnd, not(3)), 0) { revert(0, 0) }
            }
            function abi_decode(headStart, dataEnd)
            {
                if slt(sub(dataEnd, headStart), 0) { revert(0, 0) }
            }
            function abi_encode_contract_PluginRepoRegistry(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
            }
            function abi_decode_addresst_struct_PluginUpdateParams_calldatat_array_address_dyn_calldatat_bytes(dataEnd) -> value0, value1, value2, value3, value4
            {
                if slt(add(dataEnd, not(3)), 288) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                if slt(add(dataEnd, not(35)), 192) { revert(0, 0) }
                value1 := 36
                let offset := calldataload(228)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                let value2_1, value3_1 := abi_decode_array_address_dyn_calldata(add(4, offset), dataEnd)
                value2 := value2_1
                value3 := value3_1
                let offset_1 := calldataload(260)
                if gt(offset_1, _1) { revert(0, 0) }
                value4 := abi_decode_bytes(add(4, offset_1), dataEnd)
            }
            function copy_memory_to_memory(src, dst, length)
            {
                let i := 0
                for { } lt(i, length) { i := add(i, 32) }
                {
                    mstore(add(dst, i), mload(add(src, i)))
                }
                if gt(i, length) { mstore(add(dst, length), 0) }
            }
            function abi_encode_bytes(value, pos) -> end
            {
                let length := mload(value)
                mstore(pos, length)
                copy_memory_to_memory(add(value, 0x20), add(pos, 0x20), length)
                end := add(add(pos, and(add(length, 31), not(31))), 0x20)
            }
            function abi_encode_array_struct_ItemMultiTarget_dyn_bytes(headStart, value0, value1) -> tail
            {
                mstore(headStart, 64)
                let tail_1 := abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(value0, add(headStart, 64))
                mstore(add(headStart, 32), sub(tail_1, headStart))
                tail := abi_encode_bytes(value1, tail_1)
            }
            function abi_encode_bytes32(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xf796b89427c6552c1ac705d833bfb7909f8eb5ce502c1db97f85fabc6ad83548)
            }
            function abi_encode_tuple_bytes32(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xb03cf3d518f6d49560b7f5bece1ccb8fd50ea7370f02f5e5210edba04be3c4f7)
            }
            function abi_encode_bytes32_7722(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xbd4dbacf5ba6d9793f600403b3293d6ecd695fcc703a2b5edcf245f45fda6cfa)
            }
            function abi_decode_addresst_addresst_struct_Tag_calldatat_contract_PluginRepot_array_address_dyn_calldatat_array_struct_ItemMultiTarget_calldata_dyn_calldata(dataEnd) -> value0, value1, value2, value3, value4, value5, value6, value7
            {
                if slt(add(dataEnd, not(3)), 224) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let value_1 := calldataload(36)
                validator_revert_address(value_1)
                value1 := value_1
                if slt(add(dataEnd, not(67)), 64) { revert(0, 0) }
                value2 := 68
                let value_2 := calldataload(132)
                validator_revert_address(value_2)
                value3 := value_2
                let offset := calldataload(164)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                let value4_1, value5_1 := abi_decode_array_address_dyn_calldata(add(4, offset), dataEnd)
                value4 := value4_1
                value5 := value5_1
                let offset_1 := calldataload(196)
                if gt(offset_1, _1) { revert(0, 0) }
                let value6_1, value7_1 := abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(add(4, offset_1), dataEnd)
                value6 := value6_1
                value7 := value7_1
            }
            function abi_decode_addresst_struct_Tag_calldatat_contract_PluginRepot_addresst_array_struct_ItemMultiTarget_calldata_dyn_calldata(dataEnd) -> value0, value1, value2, value3, value4, value5
            {
                if slt(add(dataEnd, not(3)), 192) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                if slt(add(dataEnd, not(35)), 64) { revert(0, 0) }
                value1 := 36
                let value_1 := calldataload(100)
                validator_revert_address(value_1)
                value2 := value_1
                let value_2 := calldataload(132)
                validator_revert_address(value_2)
                value3 := value_2
                let offset := calldataload(164)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                let value4_1, value5_1 := abi_decode_array_struct_ItemMultiTarget_calldata_dyn_calldata(add(4, offset), dataEnd)
                value4 := value4_1
                value5 := value5_1
            }
            function cleanup_bool(value) -> cleaned
            {
                cleaned := iszero(iszero(value))
            }
            function abi_decode_t_bool_fromMemory(offset) -> value
            {
                value := mload(offset)
                if iszero(eq(value, iszero(iszero(value)))) { revert(0, 0) }
            }
            function abi_decode_bool_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                value0 := abi_decode_t_bool_fromMemory(headStart)
            }
            function revert_forward()
            {
                let pos := mload(64)
                returndatacopy(pos, 0, returndatasize())
                revert(pos, returndatasize())
            }
            function cleanup_uint8(value) -> cleaned
            { cleaned := and(value, 0xff) }
            function validator_revert_uint8(value)
            {
                if iszero(eq(value, and(value, 0xff))) { revert(0, 0) }
            }
            function validator_revert_uint16(value)
            {
                if iszero(eq(value, and(value, 0xffff))) { revert(0, 0) }
            }
            function abi_decode_address_fromMemory(offset) -> value
            {
                value := mload(offset)
                validator_revert_address(value)
            }
            function abi_decode_bytes_fromMemory(offset, end) -> array
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                let _1 := mload(offset)
                let _2 := array_allocation_size_bytes(_1)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _2)
                mstore(memPtr, _1)
                if gt(add(add(offset, _1), 0x20), end) { revert(0, 0) }
                copy_memory_to_memory(add(offset, 0x20), add(memPtr, 0x20), _1)
                array := memPtr
            }
            function abi_decode_struct_Version_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let offset := mload(headStart)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                let _2 := add(headStart, offset)
                let _3 := sub(dataEnd, _2)
                if slt(_3, 0xa0) { revert(0, 0) }
                let memPtr := mload(64)
                finalize_allocation_7727(memPtr)
                if slt(_3, 64) { revert(0, 0) }
                let memPtr_1 := mload(64)
                finalize_allocation_7728(memPtr_1)
                let value := mload(_2)
                validator_revert_uint8(value)
                mstore(memPtr_1, value)
                let value_1 := mload(add(_2, 32))
                validator_revert_uint16(value_1)
                mstore(add(memPtr_1, 32), value_1)
                mstore(memPtr, memPtr_1)
                mstore(add(memPtr, 32), abi_decode_address_fromMemory(add(_2, 64)))
                mstore(add(memPtr, 64), abi_decode_t_bool_fromMemory(add(_2, 96)))
                let offset_1 := mload(add(_2, 0x80))
                if gt(offset_1, _1) { revert(0, 0) }
                mstore(add(memPtr, 96), abi_decode_bytes_fromMemory(add(_2, offset_1), dataEnd))
                value0 := memPtr
            }
            function abi_encode_struct_Tag_calldata_ptr(value, pos)
            {
                let value_1 := calldataload(value)
                validator_revert_uint8(value_1)
                mstore(pos, and(value_1, 0xff))
                let value_2 := calldataload(add(value, 0x20))
                validator_revert_uint16(value_2)
                mstore(add(pos, 0x20), and(value_2, 0xffff))
            }
            function abi_encode_struct_Tag_calldata(headStart, value0) -> tail
            {
                tail := add(headStart, 64)
                abi_encode_struct_Tag_calldata_ptr(value0, headStart)
            }
            function array_allocation_size_array_address_dyn(length) -> size
            {
                if gt(length, 0xffffffffffffffff) { panic_error_0x41() }
                size := add(shl(5, length), 0x20)
            }
            function abi_decode_array_address_dyn_fromMemory(offset, end) -> array
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                let _1 := mload(offset)
                let _2 := 0x20
                let _3 := array_allocation_size_array_address_dyn(_1)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _3)
                let dst := memPtr
                mstore(memPtr, _1)
                dst := add(memPtr, _2)
                let srcEnd := add(add(offset, shl(5, _1)), _2)
                if gt(srcEnd, end) { revert(0, 0) }
                let src := add(offset, _2)
                for { } lt(src, srcEnd) { src := add(src, _2) }
                {
                    let value := mload(src)
                    validator_revert_address(value)
                    mstore(dst, value)
                    dst := add(dst, _2)
                }
                array := memPtr
            }
            function validator_revert_enum_Operation(value)
            {
                if iszero(lt(value, 4)) { revert(0, 0) }
            }
            function abi_decode_array_struct_ItemMultiTarget_dyn_fromMemory(offset, end) -> array
            {
                if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
                let _1 := mload(offset)
                let _2 := 0x20
                let _3 := array_allocation_size_array_address_dyn(_1)
                let _4 := 64
                let memPtr := mload(_4)
                finalize_allocation(memPtr, _3)
                let dst := memPtr
                mstore(memPtr, _1)
                dst := add(memPtr, _2)
                let _5 := 0xa0
                let srcEnd := add(add(offset, mul(_1, _5)), _2)
                if gt(srcEnd, end) { revert(0, 0) }
                let src := add(offset, _2)
                for { } lt(src, srcEnd) { src := add(src, _5) }
                {
                    if slt(sub(end, src), _5)
                    {
                        let _6 := 0
                        revert(_6, _6)
                    }
                    let memPtr_1 := mload(_4)
                    finalize_allocation_7731(memPtr_1)
                    let value := mload(src)
                    validator_revert_enum_Operation(value)
                    mstore(memPtr_1, value)
                    let value_1 := mload(add(src, _2))
                    validator_revert_address(value_1)
                    mstore(add(memPtr_1, _2), value_1)
                    let value_2 := mload(add(src, _4))
                    validator_revert_address(value_2)
                    mstore(add(memPtr_1, _4), value_2)
                    let _7 := 96
                    let value_3 := mload(add(src, _7))
                    validator_revert_address(value_3)
                    mstore(add(memPtr_1, _7), value_3)
                    let _8 := 128
                    mstore(add(memPtr_1, _8), mload(add(src, _8)))
                    mstore(dst, memPtr_1)
                    dst := add(dst, _2)
                }
                array := memPtr
            }
            function abi_decode_addresst_array_address_dynt_array_struct_ItemMultiTarget_dyn_fromMemory(headStart, dataEnd) -> value0, value1, value2
            {
                if slt(sub(dataEnd, headStart), 96) { revert(0, 0) }
                let value := mload(headStart)
                validator_revert_address(value)
                value0 := value
                let offset := mload(add(headStart, 32))
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                value1 := abi_decode_array_address_dyn_fromMemory(add(headStart, offset), dataEnd)
                let offset_1 := mload(add(headStart, 64))
                if gt(offset_1, _1) { revert(0, 0) }
                value2 := abi_decode_array_struct_ItemMultiTarget_dyn_fromMemory(add(headStart, offset_1), dataEnd)
            }
            function abi_encode_address_bytes(headStart, value0, value1) -> tail
            {
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
                mstore(add(headStart, 32), 64)
                tail := abi_encode_bytes(value1, add(headStart, 64))
            }
            function mapping_index_access_mapping_bytes32_bytes32_of_bytes32(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x02)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x05)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7736(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x01)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7764(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x03)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7779(key) -> dataSlot
            {
                mstore(0, key)
                mstore(0x20, 0x04)
                dataSlot := keccak256(0, 0x40)
            }
            function abi_encode_struct_Tag_calldata_bytes_address_array_address_dyn_array_struct_ItemMultiTarget_dyn(headStart, value0, value1, value2, value3, value4) -> tail
            {
                abi_encode_struct_Tag_calldata_ptr(value0, headStart)
                mstore(add(headStart, 64), 192)
                let tail_1 := abi_encode_bytes(value1, add(headStart, 192))
                mstore(add(headStart, 96), and(value2, sub(shl(160, 1), 1)))
                mstore(add(headStart, 128), sub(tail_1, headStart))
                let tail_2 := abi_encode_array_address_dyn(value3, tail_1)
                mstore(add(headStart, 160), sub(tail_2, headStart))
                tail := abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(value4, tail_2)
            }
            function fun_prepareInstallation(var_dao, var_versionTag_264_offset, var_pluginSetupRepo_267_address, var__data_mpos) -> var_plugin, var_helpers_mpos, var_permissions_279_mpos
            {
                let expr_282_address := cleanup_address(cleanup_address(sload(0x06)))
                let _1 := and(var_pluginSetupRepo_267_address, sub(shl(160, 1), 1))
                let _2 := 64
                let _3 := mload(_2)
                mstore(_3, shl(224, 0xf29ee125))
                let _4 := staticcall(gas(), expr_282_address, _3, sub(abi_encode_contract_PluginRepoRegistry(add(_3, 4), _1), _3), _3, 32)
                if iszero(_4) { revert_forward() }
                let expr := 0
                if _4
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(expr)
                {
                    let _5 := mload(_2)
                    mstore(_5, shl(226, 0x0353faad))
                    revert(_5, 4)
                }
                let _6 := mload(_2)
                mstore(_6, shl(224, 0x9af3e909))
                let _7 := staticcall(gas(), _1, _6, sub(abi_encode_struct_Tag_calldata(add(_6, 4), var_versionTag_264_offset), _6), _6, 0)
                if iszero(_7) { revert_forward() }
                let expr_302_mpos := 0
                if _7
                {
                    returndatacopy(_6, expr_302_mpos, returndatasize())
                    finalize_allocation(_6, returndatasize())
                    expr_302_mpos := abi_decode_struct_Version_fromMemory(_6, add(_6, returndatasize()))
                }
                let expr_address := cleanup_address(cleanup_address(cleanup_address(mload(add(expr_302_mpos, 32)))))
                let _8 := mload(_2)
                mstore(_8, shl(224, 0xf10832f1))
                let _9 := call(gas(), expr_address, 0, _8, sub(abi_encode_address_bytes(add(_8, 4), var_dao, var__data_mpos), _8), _8, 0)
                if iszero(_9) { revert_forward() }
                let expr_component := 0
                let expr_319_component_2_mpos := expr_component
                let expr_319_component_3_mpos := expr_component
                if _9
                {
                    returndatacopy(_8, expr_component, returndatasize())
                    finalize_allocation(_8, returndatasize())
                    let expr_component_1, expr_component_mpos, expr_component_mpos_1 := abi_decode_addresst_array_address_dynt_array_struct_ItemMultiTarget_dyn_fromMemory(_8, add(_8, returndatasize()))
                    expr_component := expr_component_1
                    expr_319_component_2_mpos := expr_component_mpos
                    expr_319_component_3_mpos := expr_component_mpos_1
                }
                var_permissions_279_mpos := expr_319_component_3_mpos
                var_helpers_mpos := expr_319_component_2_mpos
                var_plugin := expr_component
                let expr_1 := fun_getSetupId(var_dao, var_versionTag_264_offset, _1, expr_component)
                if iszero(iszero(sload(mapping_index_access_mapping_bytes32_bytes32_of_bytes32(expr_1))))
                {
                    let _10 := mload(_2)
                    mstore(_10, shl(224, 0xd7c117df))
                    revert(_10, 4)
                }
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32(expr_1), fun_getPermissionsHash(expr_319_component_3_mpos))
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(expr_1), fun_getHelpersHash(expr_319_component_2_mpos))
                let _11 := mload(_2)
                log4(_11, sub(abi_encode_struct_Tag_calldata_bytes_address_array_address_dyn_array_struct_ItemMultiTarget_dyn(_11, var_versionTag_264_offset, var__data_mpos, expr_component, expr_319_component_2_mpos, expr_319_component_3_mpos), _11), 0xe29ea05bde71a330983c88d2510bc7c79dc7d3ff304e256df9222ac4a44dfc79, caller(), var_dao, var_pluginSetupRepo_267_address)
            }
            function modifier_canApply_396(var_dao, var_versionTag_382_offset, var_pluginSetupRepo_385_address, var_plugin, var_permissions_offset, var_permissions_391_length)
            {
                fun_canApply_7735(var_dao)
                let expr := fun_getAppliedId(var_dao, var_plugin)
                if read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7736(expr))
                {
                    let _1 := mload(64)
                    mstore(_1, shl(224, 0x7607b201))
                    revert(_1, 4)
                }
                let _2 := sub(shl(160, 1), 1)
                let expr_1 := fun_getSetupId(var_dao, var_versionTag_382_offset, and(var_pluginSetupRepo_385_address, _2), var_plugin)
                let _3 := sload(mapping_index_access_mapping_bytes32_bytes32_of_bytes32(expr_1))
                if iszero(_3)
                {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0xaa4f4bbb))
                    revert(_4, 4)
                }
                if iszero(eq(_3, fun_getPermissionsHash(abi_decode_available_length_array_struct_ItemMultiTarget_dyn(var_permissions_offset, var_permissions_391_length, calldatasize()))))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0x7fe4f3b5))
                    revert(_5, 4)
                }
                let _6 := and(var_dao, _2)
                if iszero(extcodesize(_6)) { revert(0, 0) }
                let _7 := mload(64)
                mstore(_7, shl(224, 0xb4276a87))
                let _8 := call(gas(), _6, 0, _7, sub(abi_encode_array_struct_ItemMultiTarget_calldata_dyn_calldata(add(_7, 4), var_permissions_offset, var_permissions_391_length), _7), _7, 0)
                if iszero(_8) { revert_forward() }
                if _8
                {
                    finalize_allocation(_7, returndatasize())
                    abi_decode(_7, add(_7, returndatasize()))
                }
                update_storage_value_offsett_bool_to_bool(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7736(expr))
                let _9 := mload(64)
                log4(_9, sub(abi_encode_struct_Tag_calldata(_9, var_versionTag_382_offset), _9), 0xde88728b8e55f279dae4cf965af9d850eb6d898f6ebe0473a191ce9ea948fbb2, var_dao, var_plugin, var_pluginSetupRepo_385_address)
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32(expr_1), 0)
            }
            function read_from_storage_split_offset_bool(slot) -> value
            {
                value := and(sload(slot), 0xff)
            }
            function abi_decode_available_length_array_struct_ItemMultiTarget_dyn(offset, length, end) -> array
            {
                let _1 := array_allocation_size_array_address_dyn(length)
                let _2 := 64
                let memPtr := mload(_2)
                finalize_allocation(memPtr, _1)
                array := memPtr
                let dst := memPtr
                mstore(memPtr, length)
                let _3 := 0x20
                dst := add(memPtr, _3)
                let _4 := 0xa0
                let srcEnd := add(offset, mul(length, _4))
                if gt(srcEnd, end) { revert(0, 0) }
                let src := offset
                for { } lt(src, srcEnd) { src := add(src, _4) }
                {
                    if slt(sub(end, src), _4)
                    {
                        let _5 := 0
                        revert(_5, _5)
                    }
                    let memPtr_1 := mload(_2)
                    finalize_allocation_7731(memPtr_1)
                    let value := calldataload(src)
                    validator_revert_enum_Operation(value)
                    mstore(memPtr_1, value)
                    let value_1 := calldataload(add(src, _3))
                    validator_revert_address(value_1)
                    mstore(add(memPtr_1, _3), value_1)
                    let value_2 := calldataload(add(src, _2))
                    validator_revert_address(value_2)
                    mstore(add(memPtr_1, _2), value_2)
                    let _6 := 96
                    let value_3 := calldataload(add(src, _6))
                    validator_revert_address(value_3)
                    mstore(add(memPtr_1, _6), value_3)
                    let _7 := 128
                    mstore(add(memPtr_1, _7), calldataload(add(src, _7)))
                    mstore(dst, memPtr_1)
                    dst := add(dst, _3)
                }
            }
            function abi_encode_array_struct_ItemMultiTarget_calldata_dyn_calldata(headStart, value0, value1) -> tail
            {
                let _1 := 32
                let tail_1 := add(headStart, _1)
                mstore(headStart, _1)
                let pos := tail_1
                mstore(tail_1, value1)
                let _2 := 64
                pos := add(headStart, _2)
                let srcPtr := value0
                let i := 0
                for { } lt(i, value1) { i := add(i, 1) }
                {
                    let value := calldataload(srcPtr)
                    validator_revert_enum_Operation(value)
                    abi_encode_enum_Operation(value, pos)
                    let value_1 := calldataload(add(srcPtr, _1))
                    validator_revert_address(value_1)
                    let _3 := sub(shl(160, 1), 1)
                    mstore(add(pos, _1), and(value_1, _3))
                    let value_2 := calldataload(add(srcPtr, _2))
                    validator_revert_address(value_2)
                    mstore(add(pos, _2), and(value_2, _3))
                    let _4 := 0x60
                    let value_3 := calldataload(add(srcPtr, _4))
                    validator_revert_address(value_3)
                    mstore(add(pos, _4), and(value_3, _3))
                    let _5 := 0x80
                    mstore(add(pos, _5), calldataload(add(srcPtr, _5)))
                    let _6 := 0xa0
                    pos := add(pos, _6)
                    srcPtr := add(srcPtr, _6)
                }
                tail := pos
            }
            function update_storage_value_offsett_bool_to_bool(slot)
            {
                sstore(slot, or(and(sload(slot), not(255)), 0x01))
            }
            function read_from_calldatat_uint8(ptr) -> returnValue
            {
                let value := calldataload(ptr)
                validator_revert_uint8(value)
                returnValue := value
            }
            function read_from_calldatat_uint16(ptr) -> returnValue
            {
                let value := calldataload(ptr)
                validator_revert_uint16(value)
                returnValue := value
            }
            function read_from_calldatat_address(ptr) -> returnValue
            {
                let value := calldataload(ptr)
                validator_revert_address(value)
                returnValue := value
            }
            function abi_decode_enum_PluginType_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let value := mload(headStart)
                if iszero(lt(value, 3)) { revert(0, 0) }
                value0 := value
            }
            function validator_assert_enum_PluginType(value)
            {
                if iszero(lt(value, 3)) { panic_error_0x21() }
            }
            function abi_decode_available_length_array_address_dyn(offset, length, end) -> array
            {
                let _1 := array_allocation_size_array_address_dyn(length)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _1)
                array := memPtr
                let dst := memPtr
                mstore(memPtr, length)
                let _2 := 0x20
                dst := add(memPtr, _2)
                let srcEnd := add(offset, shl(5, length))
                if gt(srcEnd, end) { revert(0, 0) }
                let src := offset
                for { } lt(src, srcEnd) { src := add(src, _2) }
                {
                    let value := calldataload(src)
                    validator_revert_address(value)
                    mstore(dst, value)
                    dst := add(dst, _2)
                }
            }
            function abi_decode_array_address_dynt_bytest_array_struct_ItemMultiTarget_dyn_fromMemory(headStart, dataEnd) -> value0, value1, value2
            {
                if slt(sub(dataEnd, headStart), 96) { revert(0, 0) }
                let offset := mload(headStart)
                let _1 := 0xffffffffffffffff
                if gt(offset, _1) { revert(0, 0) }
                value0 := abi_decode_array_address_dyn_fromMemory(add(headStart, offset), dataEnd)
                let offset_1 := mload(add(headStart, 32))
                if gt(offset_1, _1) { revert(0, 0) }
                value1 := abi_decode_bytes_fromMemory(add(headStart, offset_1), dataEnd)
                let offset_2 := mload(add(headStart, 64))
                if gt(offset_2, _1) { revert(0, 0) }
                value2 := abi_decode_array_struct_ItemMultiTarget_dyn_fromMemory(add(headStart, offset_2), dataEnd)
            }
            function abi_encode_array_address_dyn_calldata(value, length, pos) -> end
            {
                mstore(pos, length)
                let _1 := 0x20
                pos := add(pos, _1)
                let srcPtr := value
                let i := 0
                for { } lt(i, length) { i := add(i, 1) }
                {
                    let value_1 := calldataload(srcPtr)
                    validator_revert_address(value_1)
                    mstore(pos, and(value_1, sub(shl(160, 1), 1)))
                    pos := add(pos, _1)
                    srcPtr := add(srcPtr, _1)
                }
                end := pos
            }
            function abi_encode_address_address_array_address_dyn_calldata_uint16_bytes(headStart, value0, value1, value2, value3, value4, value5) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 160)
                let tail_1 := abi_encode_array_address_dyn_calldata(value2, value3, add(headStart, 160))
                mstore(add(headStart, 96), and(value4, 0xffff))
                mstore(add(headStart, 128), sub(tail_1, headStart))
                tail := abi_encode_bytes(value5, tail_1)
            }
            function abi_encode_struct_Tag_calldata_bytes_address_array_address_dyn_array_struct_ItemMultiTarget_dyn_bytes(headStart, value0, value1, value2, value3, value4, value5) -> tail
            {
                abi_encode_struct_Tag_calldata_ptr(value0, headStart)
                mstore(add(headStart, 64), 224)
                let tail_1 := abi_encode_bytes(value1, add(headStart, 224))
                mstore(add(headStart, 96), and(value2, sub(shl(160, 1), 1)))
                mstore(add(headStart, 128), sub(tail_1, headStart))
                let tail_2 := abi_encode_array_address_dyn(value3, tail_1)
                mstore(add(headStart, 160), sub(tail_2, headStart))
                let tail_3 := abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(value4, tail_2)
                mstore(add(headStart, 192), sub(tail_3, headStart))
                tail := abi_encode_bytes(value5, tail_3)
            }
            function fun_prepareUpdate(var_dao, var_updateParams_offset, var_currentHelpers_offset, var_currentHelpers_490_length, var_data_mpos) -> var_497_mpos, var_mpos
            {
                let _1 := 64
                let _2 := add(var_updateParams_offset, _1)
                let expr := read_from_calldatat_uint8(_2)
                let _3 := add(var_updateParams_offset, 128)
                if eq(and(expr, 0xff), cleanup_uint8(read_from_calldatat_uint8(_3)))
                {
                    pop(read_from_calldatat_uint16(add(var_updateParams_offset, 96)))
                    pop(read_from_calldatat_uint16(add(var_updateParams_offset, 160)))
                }
                if cleanup_bool(iszero(fun_supportsInterface(read_from_calldatat_address(var_updateParams_offset))))
                {
                    let expr_1 := read_from_calldatat_address(var_updateParams_offset)
                    let _4 := mload(_1)
                    mstore(_4, shl(224, 0x8174ff55))
                    revert(_4, sub(abi_encode_contract_PluginRepoRegistry(add(_4, 4), expr_1), _4))
                }
                let expr_538_address := cleanup_address(cleanup_address(read_from_calldatat_address(var_updateParams_offset)))
                let _5 := mload(_1)
                mstore(_5, shl(228, 0x041de683))
                let _6 := 4
                let _7 := staticcall(gas(), expr_538_address, _5, _6, _5, 32)
                if iszero(_7) { revert_forward() }
                let expr_2 := 0
                if _7
                {
                    finalize_allocation(_5, returndatasize())
                    expr_2 := abi_decode_enum_PluginType_fromMemory(_5, add(_5, returndatasize()))
                }
                validator_assert_enum_PluginType(expr_2)
                if iszero(iszero(expr_2))
                {
                    let expr_3 := read_from_calldatat_address(var_updateParams_offset)
                    let _8 := mload(_1)
                    mstore(_8, shl(226, 0x390d5b25))
                    revert(_8, sub(abi_encode_contract_PluginRepoRegistry(add(_8, _6), expr_3), _8))
                }
                let expr_552_address := cleanup_address(cleanup_address(sload(0x06)))
                let _9 := add(var_updateParams_offset, 32)
                let expr_4 := cleanup_address(read_from_calldatat_address(_9))
                let _10 := mload(_1)
                mstore(_10, shl(224, 0xf29ee125))
                let _11 := staticcall(gas(), expr_552_address, _10, sub(abi_encode_contract_PluginRepoRegistry(add(_10, _6), expr_4), _10), _10, 32)
                if iszero(_11) { revert_forward() }
                let expr_5 := 0
                if _11
                {
                    finalize_allocation(_10, returndatasize())
                    expr_5 := abi_decode_bool_fromMemory(_10, add(_10, returndatasize()))
                }
                if iszero(expr_5)
                {
                    let _12 := mload(_1)
                    mstore(_12, shl(226, 0x0353faad))
                    revert(_12, _6)
                }
                if cleanup_bool(iszero(read_from_storage_split_offset_bool(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7736(fun_getAppliedId(var_dao, read_from_calldatat_address(var_updateParams_offset))))))
                {
                    let _13 := mload(_1)
                    mstore(_13, shl(224, 0x8ecadf33))
                    revert(_13, _6)
                }
                let expr_6 := cleanup_address(read_from_calldatat_address(_9))
                let expr_7 := fun_getSetupId(var_dao, _2, expr_6, read_from_calldatat_address(var_updateParams_offset))
                let _14 := sload(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(expr_7))
                if iszero(eq(_14, fun_getHelpersHash(abi_decode_available_length_array_address_dyn(var_currentHelpers_offset, var_currentHelpers_490_length, calldatasize()))))
                {
                    let _15 := mload(_1)
                    mstore(_15, shl(225, 0x602519bb))
                    revert(_15, _6)
                }
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(expr_7), 0)
                let expr_620_address := cleanup_address(read_from_calldatat_address(_9))
                let _16 := mload(_1)
                let _17 := shl(224, 0x9af3e909)
                mstore(_16, _17)
                let _18 := staticcall(gas(), expr_620_address, _16, sub(abi_encode_struct_Tag_calldata(add(_16, _6), _2), _16), _16, 0)
                if iszero(_18) { revert_forward() }
                if _18
                {
                    returndatacopy(_16, 0, returndatasize())
                    finalize_allocation(_16, returndatasize())
                    pop(abi_decode_struct_Version_fromMemory(_16, add(_16, returndatasize())))
                }
                let expr_632_address := cleanup_address(read_from_calldatat_address(_9))
                let _19 := mload(_1)
                mstore(_19, _17)
                let _20 := staticcall(gas(), expr_632_address, _19, sub(abi_encode_struct_Tag_calldata(add(_19, _6), _3), _19), _19, 0)
                if iszero(_20) { revert_forward() }
                let expr_635_mpos := 0
                if _20
                {
                    returndatacopy(_19, expr_635_mpos, returndatasize())
                    finalize_allocation(_19, returndatasize())
                    expr_635_mpos := abi_decode_struct_Version_fromMemory(_19, add(_19, returndatasize()))
                }
                let expr_663_address := cleanup_address(cleanup_address(cleanup_address(mload(add(expr_635_mpos, 32)))))
                let expr_8 := read_from_calldatat_address(var_updateParams_offset)
                let expr_9 := read_from_calldatat_uint16(add(var_updateParams_offset, 96))
                let _21 := mload(_1)
                mstore(_21, shl(225, 0x4374b9d5))
                let _22 := call(gas(), expr_663_address, 0, _21, sub(abi_encode_address_address_array_address_dyn_calldata_uint16_bytes(add(_21, _6), var_dao, expr_8, var_currentHelpers_offset, var_currentHelpers_490_length, expr_9, var_data_mpos), _21), _21, 0)
                if iszero(_22) { revert_forward() }
                let expr_672_component_1_mpos := 0
                let expr_672_component_2_mpos := expr_672_component_1_mpos
                let expr_672_component_3_mpos := expr_672_component_1_mpos
                if _22
                {
                    returndatacopy(_21, expr_672_component_1_mpos, returndatasize())
                    finalize_allocation(_21, returndatasize())
                    let expr_component_mpos, expr_component_mpos_1, expr_component_mpos_2 := abi_decode_array_address_dynt_bytest_array_struct_ItemMultiTarget_dyn_fromMemory(_21, add(_21, returndatasize()))
                    expr_672_component_1_mpos := expr_component_mpos
                    expr_672_component_2_mpos := expr_component_mpos_1
                    expr_672_component_3_mpos := expr_component_mpos_2
                }
                let expr_10 := cleanup_address(read_from_calldatat_address(_9))
                let expr_11 := fun_getSetupId(var_dao, _3, expr_10, read_from_calldatat_address(var_updateParams_offset))
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(expr_11), fun_getHelpersHash(expr_672_component_1_mpos))
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7764(expr_11), fun_getPermissionsHash(expr_672_component_3_mpos))
                let expr_711_address := read_from_calldatat_address(_9)
                let expr_12 := read_from_calldatat_address(var_updateParams_offset)
                let _23 := mload(_1)
                log4(_23, sub(abi_encode_struct_Tag_calldata_bytes_address_array_address_dyn_array_struct_ItemMultiTarget_dyn_bytes(_23, _3, var_data_mpos, expr_12, expr_672_component_1_mpos, expr_672_component_3_mpos, expr_672_component_2_mpos), _23), 0xda3c7914f7359bc39d908dfcb181386f323a1694aa9223abda6ddfd52d0717e9, caller(), var_dao, expr_711_address)
                var_497_mpos := expr_672_component_3_mpos
                var_mpos := expr_672_component_2_mpos
            }
            function modifier_canApply_749(var_dao, var_plugin, var_versionTag_offset, var_pluginSetupRepo_address, var_initData_mpos, var_permissions_744_offset, var_permissions_744_length)
            {
                fun_canApply(var_dao)
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(var_pluginSetupRepo_address, _1)
                let expr := fun_getSetupId(var_dao, var_versionTag_offset, _2, var_plugin)
                let _3 := sload(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7764(expr))
                if iszero(eq(_3, fun_getPermissionsHash(abi_decode_available_length_array_struct_ItemMultiTarget_dyn(var_permissions_744_offset, var_permissions_744_length, calldatasize()))))
                {
                    let _4 := mload(64)
                    mstore(_4, shl(224, 0x7fe4f3b5))
                    revert(_4, 4)
                }
                let _5 := mload(64)
                mstore(_5, shl(224, 0x9af3e909))
                let _6 := 0
                let _7 := staticcall(gas(), _2, _5, sub(abi_encode_struct_Tag_calldata(add(_5, 4), var_versionTag_offset), _5), _5, _6)
                if iszero(_7) { revert_forward() }
                let expr_mpos := _6
                if _7
                {
                    returndatacopy(_5, _6, returndatasize())
                    finalize_allocation(_5, returndatasize())
                    expr_mpos := abi_decode_struct_Version_fromMemory(_5, add(_5, returndatasize()))
                }
                let _8 := mload(64)
                let _9 := shl(228, 13355751)
                mstore(_8, _9)
                let _10 := staticcall(gas(), and(var_plugin, _1), _8, 4, _8, 32)
                if iszero(_10) { revert_forward() }
                let expr_1 := _6
                if _10
                {
                    finalize_allocation(_8, returndatasize())
                    expr_1 := abi_decode_tuple_address_fromMemory(_8, add(_8, returndatasize()))
                }
                let expr_address := cleanup_address(cleanup_address(cleanup_address(mload(add(expr_mpos, 32)))))
                let _11 := mload(64)
                mstore(_11, _9)
                let _12 := staticcall(gas(), expr_address, _11, 4, _11, 32)
                if iszero(_12) { revert_forward() }
                let expr_2 := _6
                if _12
                {
                    finalize_allocation(_11, returndatasize())
                    expr_2 := abi_decode_tuple_address_fromMemory(_11, add(_11, returndatasize()))
                }
                if iszero(eq(and(expr_1, _1), and(expr_2, _1)))
                {
                    fun_upgradeProxy(var_plugin, expr_2, var_initData_mpos)
                }
                let _13 := and(var_dao, _1)
                if iszero(extcodesize(_13)) { revert(_6, _6) }
                let _14 := mload(64)
                mstore(_14, shl(224, 0xb4276a87))
                let _15 := call(gas(), _13, _6, _14, sub(abi_encode_array_struct_ItemMultiTarget_calldata_dyn_calldata(add(_14, 4), var_permissions_744_offset, var_permissions_744_length), _14), _14, _6)
                if iszero(_15) { revert_forward() }
                if _15
                {
                    finalize_allocation(_14, returndatasize())
                    abi_decode(_14, add(_14, returndatasize()))
                }
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7764(expr), _6)
                let _16 := mload(64)
                log4(_16, sub(abi_encode_struct_Tag_calldata(_16, var_versionTag_offset), _16), 0xa7a5c039629170f6c94b3b062ee8b980cbf756a6beb77941eebd0d63f2660464, var_dao, var_plugin, var_pluginSetupRepo_address)
            }
            function abi_decode_tuple_address_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let value := mload(headStart)
                validator_revert_address(value)
                value0 := value
            }
            function fun_prepareUninstallation(var_dao, var_plugin, var_versionTag_864_offset, var_pluginSetupRepo_867_address, var_currentHelpers_870_offset, var__currentHelpers_length) -> var_permissions_mpos
            {
                var_permissions_mpos := 96
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(var_pluginSetupRepo_867_address, _1)
                pop(fun_getSetupId(var_dao, var_versionTag_864_offset, _2, var_plugin))
                let _3 := mload(64)
                mstore(_3, shl(224, 0x9af3e909))
                abi_encode_struct_Tag_calldata_ptr(var_versionTag_864_offset, add(_3, 4))
                let _4 := staticcall(gas(), _2, _3, 68, _3, 0)
                if iszero(_4) { revert_forward() }
                if _4
                {
                    returndatacopy(_3, 0, returndatasize())
                    finalize_allocation(_3, returndatasize())
                    pop(abi_decode_struct_Version_fromMemory(_3, add(_3, returndatasize())))
                }
                let _5 := mload(64)
                abi_encode_struct_Tag_calldata_ptr(var_versionTag_864_offset, _5)
                mstore(add(_5, 64), and(var_plugin, _1))
                mstore(add(_5, var_permissions_mpos), 160)
                let tail := abi_encode_array_address_dyn_calldata(var_currentHelpers_870_offset, var__currentHelpers_length, add(_5, 160))
                mstore(add(_5, 128), sub(tail, _5))
                log4(_5, sub(abi_encode_array_struct_ItemMultiTarget_dyn_7776(tail), _5), 0x354a1eca455bf4b7c439bf103599e87e5fde66ba5fdbf80c7b30d62bf5e1498d, caller(), var_dao, var_pluginSetupRepo_867_address)
            }
            function modifier_canApply(var_dao, var__plugin, var__versionTag_offset, var_pluginSetupRepo_924_address, var__currentHelpers_offset, var_currentHelpers_length, var_permissions_931_offset, var_permissions_length)
            {
                fun_canApply_7777(var_dao)
                let _1 := sub(shl(160, 1), 1)
                let expr := fun_getSetupId(var_dao, var__versionTag_offset, and(var_pluginSetupRepo_924_address, _1), var__plugin)
                let _2 := sload(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(expr))
                if iszero(eq(_2, fun_getHelpersHash(abi_decode_available_length_array_address_dyn(var__currentHelpers_offset, var_currentHelpers_length, calldatasize()))))
                {
                    let _3 := mload(64)
                    mstore(_3, shl(225, 0x602519bb))
                    revert(_3, 4)
                }
                let _4 := sload(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7779(expr))
                if iszero(eq(_4, fun_getPermissionsHash(abi_decode_available_length_array_struct_ItemMultiTarget_dyn(var_permissions_931_offset, var_permissions_length, calldatasize()))))
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0x7fe4f3b5))
                    revert(_5, 0x04)
                }
                let _6 := and(var_dao, _1)
                if iszero(extcodesize(_6)) { revert(0, 0) }
                let _7 := mload(64)
                mstore(_7, shl(224, 0xb4276a87))
                let _8 := call(gas(), _6, 0, _7, sub(abi_encode_array_struct_ItemMultiTarget_calldata_dyn_calldata(add(_7, 0x04), var_permissions_931_offset, var_permissions_length), _7), _7, 0)
                if iszero(_8) { revert_forward() }
                if _8
                {
                    finalize_allocation(_7, returndatasize())
                    abi_decode(_7, add(_7, returndatasize()))
                }
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7734(expr), 0)
                sstore(mapping_index_access_mapping_bytes32_bytes32_of_bytes32_7779(expr), 0)
                let _9 := mload(64)
                log4(_9, sub(abi_encode_struct_Tag_calldata(_9, var__versionTag_offset), _9), 0x011adda1378c3c9148abf190d54d74b9c9eb8129d4263b987100419321af1256, var_dao, var__plugin, var_pluginSetupRepo_924_address)
            }
            function fun_getAppliedId(var__dao, var_plugin) -> var_appliedId
            {
                let expr_1026_mpos := mload(64)
                let _1 := add(expr_1026_mpos, 0x20)
                let _2 := sub(shl(160, 1), 1)
                mstore(_1, and(var__dao, _2))
                mstore(add(expr_1026_mpos, 64), and(var_plugin, _2))
                mstore(expr_1026_mpos, 64)
                finalize_allocation_13799(expr_1026_mpos)
                var_appliedId := keccak256(_1, mload(expr_1026_mpos))
            }
            function fun_getSetupId(var_dao, var_versionTag_1037_offset, var_pluginSetupRepo, var_plugin) -> var_setupId
            {
                let expr_1054_mpos := mload(64)
                let _1 := add(expr_1054_mpos, 0x20)
                let _2 := sub(shl(160, 1), 1)
                mstore(_1, and(var_dao, _2))
                abi_encode_struct_Tag_calldata_ptr(var_versionTag_1037_offset, add(expr_1054_mpos, 64))
                mstore(add(expr_1054_mpos, 128), and(var_pluginSetupRepo, _2))
                mstore(add(expr_1054_mpos, 160), and(var_plugin, _2))
                mstore(expr_1054_mpos, 160)
                let newFreePtr := add(expr_1054_mpos, 192)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, expr_1054_mpos)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                var_setupId := keccak256(_1, mload(expr_1054_mpos))
            }
            function fun_getHelpersHash(var__helpers_mpos) -> var_helpersHash
            {
                let expr_1073_mpos := mload(64)
                let _1 := add(expr_1073_mpos, 0x20)
                mstore(_1, 0x20)
                let _2 := sub(abi_encode_array_address_dyn(var__helpers_mpos, add(expr_1073_mpos, 64)), expr_1073_mpos)
                mstore(expr_1073_mpos, add(_2, not(31)))
                finalize_allocation(expr_1073_mpos, _2)
                var_helpersHash := keccak256(_1, mload(expr_1073_mpos))
            }
            function fun_getPermissionsHash(var__permissions_mpos) -> var
            {
                let expr_1092_mpos := mload(64)
                let _1 := add(expr_1092_mpos, 0x20)
                mstore(_1, 0x20)
                let _2 := sub(abi_encode_array_struct_ItemMultiTarget_memory_ptr_dyn_memory_ptr(var__permissions_mpos, add(expr_1092_mpos, 64)), expr_1092_mpos)
                mstore(expr_1092_mpos, add(_2, not(31)))
                finalize_allocation(expr_1092_mpos, _2)
                var := keccak256(_1, mload(expr_1092_mpos))
            }
            function return_data_selector() -> sig
            {
                if gt(returndatasize(), 3)
                {
                    returndatacopy(0, 0, 4)
                    sig := shr(224, mload(0))
                }
            }
            function try_decode_error_message() -> ret
            {
                if lt(returndatasize(), 0x44) { leave }
                let data := mload(64)
                let _1 := not(3)
                returndatacopy(data, 4, add(returndatasize(), _1))
                let offset := mload(data)
                let _2 := returndatasize()
                let _3 := 0xffffffffffffffff
                if or(gt(offset, _3), gt(add(offset, 0x24), _2)) { leave }
                let msg := add(data, offset)
                let length := mload(msg)
                if gt(length, _3) { leave }
                if gt(add(add(msg, length), 0x20), add(add(data, returndatasize()), _1)) { leave }
                finalize_allocation(data, add(add(offset, length), 0x20))
                ret := msg
            }
            function abi_encode_string(headStart, value0) -> tail
            {
                mstore(headStart, 32)
                tail := abi_encode_bytes(value0, add(headStart, 32))
            }
            function allocate_memory_array_bytes() -> memPtr
            {
                let memPtr_1 := mload(64)
                let newFreePtr := add(memPtr_1, 32)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr_1)) { panic_error_0x41() }
                mstore(64, newFreePtr)
                memPtr := memPtr_1
                mstore(memPtr_1, 0)
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
            function abi_encode_address_address_bytes(headStart, value0, value1, value2) -> tail
            {
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 96)
                tail := abi_encode_bytes(value2, add(headStart, 96))
            }
            function fun_upgradeProxy(var_proxy, var_implementation, var__initData_mpos)
            {
                switch iszero(iszero(mload(var__initData_mpos)))
                case 0 {
                    let _1 := and(var_proxy, sub(shl(160, 1), 1))
                    if iszero(extcodesize(_1)) { revert(0x00, 0x00) }
                    let _2 := mload(64)
                    mstore(_2, shl(225, 0x1b2ce7f3))
                    let trySuccessCondition := call(gas(), _1, 0x00, _2, sub(abi_encode_contract_PluginRepoRegistry(add(_2, 4), var_implementation), _2), _2, 0x00)
                    if trySuccessCondition
                    {
                        finalize_allocation(_2, returndatasize())
                        abi_decode(_2, add(_2, returndatasize()))
                    }
                    switch iszero(trySuccessCondition)
                    case 0 { }
                    default {
                        let _3 := 1
                        if eq(147028384, return_data_selector())
                        {
                            let _4 := try_decode_error_message()
                            if _4
                            {
                                _3 := 0x00
                                let _5 := mload(64)
                                mstore(_5, shl(229, 4594637))
                                revert(_5, sub(abi_encode_string(add(_5, 4), _4), _5))
                            }
                        }
                        if _3
                        {
                            pop(extract_returndata())
                            let _6 := mload(64)
                            mstore(_6, shl(224, 0x96e9e31b))
                            revert(_6, sub(abi_encode_address_address_bytes(add(_6, 4), var_proxy, var_implementation, var__initData_mpos), _6))
                        }
                    }
                }
                default {
                    let _7 := and(var_proxy, sub(shl(160, 1), 1))
                    if iszero(extcodesize(_7)) { revert(0x00, 0x00) }
                    let _8 := mload(64)
                    mstore(_8, shl(225, 0x278f7943))
                    let trySuccessCondition_1 := call(gas(), _7, 0x00, _8, sub(abi_encode_address_bytes(add(_8, 4), var_implementation, var__initData_mpos), _8), _8, 0x00)
                    if trySuccessCondition_1
                    {
                        finalize_allocation(_8, returndatasize())
                        abi_decode(_8, add(_8, returndatasize()))
                    }
                    switch iszero(trySuccessCondition_1)
                    case 0 { }
                    default {
                        let _9 := 1
                        if eq(147028384, return_data_selector())
                        {
                            let _10 := try_decode_error_message()
                            if _10
                            {
                                _9 := 0x00
                                let _11 := mload(64)
                                mstore(_11, shl(229, 4594637))
                                revert(_11, sub(abi_encode_string(add(_11, 4), _10), _11))
                            }
                        }
                        if _9
                        {
                            pop(extract_returndata())
                            let _12 := mload(64)
                            mstore(_12, shl(224, 0x96e9e31b))
                            revert(_12, sub(abi_encode_address_address_bytes(add(_12, 4), var_proxy, var_implementation, var__initData_mpos), _12))
                        }
                    }
                }
            }
            function abi_encode_address_address_bytes32_13803(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xf796b89427c6552c1ac705d833bfb7909f8eb5ce502c1db97f85fabc6ad83548)
            }
            function abi_encode_address_address_bytes32(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xb03cf3d518f6d49560b7f5bece1ccb8fd50ea7370f02f5e5210edba04be3c4f7)
            }
            function abi_encode_address_address_bytes32_13807(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 96)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), 0xbd4dbacf5ba6d9793f600403b3293d6ecd695fcc703a2b5edcf245f45fda6cfa)
            }
            function fun_canApply_7735(var_dao)
            {
                let _1 := and(var_dao, sub(shl(160, 1), 1))
                let expr := iszero(eq(caller(), _1))
                if expr
                {
                    let expr_mpos := allocate_memory_array_bytes()
                    let _2 := mload(64)
                    mstore(_2, shl(225, 0x7ef7c883))
                    mstore(add(_2, 4), address())
                    mstore(add(_2, 36), caller())
                    mstore(add(_2, 68), 0xf796b89427c6552c1ac705d833bfb7909f8eb5ce502c1db97f85fabc6ad83548)
                    mstore(add(_2, 100), 128)
                    let _3 := staticcall(gas(), _1, _2, sub(abi_encode_bytes(expr_mpos, add(_2, 132)), _2), _2, 32)
                    if iszero(_3) { revert_forward() }
                    let expr_1 := 0
                    if _3
                    {
                        finalize_allocation(_2, returndatasize())
                        expr_1 := abi_decode_bool_fromMemory(_2, add(_2, returndatasize()))
                    }
                    expr := iszero(expr_1)
                }
                if expr
                {
                    let _4 := mload(64)
                    mstore(_4, shl(229, 11449463))
                    revert(_4, sub(abi_encode_address_address_bytes32_13803(add(_4, 4), var_dao, caller()), _4))
                }
            }
            function fun_canApply(var_dao)
            {
                let _1 := and(var_dao, sub(shl(160, 1), 1))
                let expr := iszero(eq(caller(), _1))
                if expr
                {
                    let expr_mpos := allocate_memory_array_bytes()
                    let _2 := mload(64)
                    mstore(_2, shl(225, 0x7ef7c883))
                    mstore(add(_2, 4), address())
                    mstore(add(_2, 36), caller())
                    mstore(add(_2, 68), 0xb03cf3d518f6d49560b7f5bece1ccb8fd50ea7370f02f5e5210edba04be3c4f7)
                    mstore(add(_2, 100), 128)
                    let _3 := staticcall(gas(), _1, _2, sub(abi_encode_bytes(expr_mpos, add(_2, 132)), _2), _2, 32)
                    if iszero(_3) { revert_forward() }
                    let expr_1 := 0
                    if _3
                    {
                        finalize_allocation(_2, returndatasize())
                        expr_1 := abi_decode_bool_fromMemory(_2, add(_2, returndatasize()))
                    }
                    expr := iszero(expr_1)
                }
                if expr
                {
                    let _4 := mload(64)
                    mstore(_4, shl(229, 11449463))
                    revert(_4, sub(abi_encode_address_address_bytes32(add(_4, 4), var_dao, caller()), _4))
                }
            }
            function fun_canApply_7777(var_dao)
            {
                let _1 := and(var_dao, sub(shl(160, 1), 1))
                let expr := iszero(eq(caller(), _1))
                if expr
                {
                    let expr_mpos := allocate_memory_array_bytes()
                    let _2 := mload(64)
                    mstore(_2, shl(225, 0x7ef7c883))
                    mstore(add(_2, 4), address())
                    mstore(add(_2, 36), caller())
                    mstore(add(_2, 68), 0xbd4dbacf5ba6d9793f600403b3293d6ecd695fcc703a2b5edcf245f45fda6cfa)
                    mstore(add(_2, 100), 128)
                    let _3 := staticcall(gas(), _1, _2, sub(abi_encode_bytes(expr_mpos, add(_2, 132)), _2), _2, 32)
                    if iszero(_3) { revert_forward() }
                    let expr_1 := 0
                    if _3
                    {
                        finalize_allocation(_2, returndatasize())
                        expr_1 := abi_decode_bool_fromMemory(_2, add(_2, returndatasize()))
                    }
                    expr := iszero(expr_1)
                }
                if expr
                {
                    let _4 := mload(64)
                    mstore(_4, shl(229, 11449463))
                    revert(_4, sub(abi_encode_address_address_bytes32_13807(add(_4, 4), var_dao, caller()), _4))
                }
            }
            function fun_supportsInterface(var_account) -> var
            {
                let expr := fun_supportsERC165Interface_7798(var_account)
                if expr
                {
                    expr := iszero(fun_supportsERC165Interface_7799(var_account))
                }
                let expr_1 := expr
                if expr
                {
                    expr_1 := fun_supportsERC165Interface(var_account)
                }
                var := expr_1
            }
            function fun_supportsERC165Interface_7798(var_account) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                let _2 := shl(224, 0x01ffc9a7)
                mstore(_1, _2)
                mstore(add(expr_mpos, 36), _2)
                mstore(expr_mpos, 36)
                finalize_allocation_13799(expr_mpos)
                let expr_component := staticcall(0x7530, var_account, _1, mload(expr_mpos), 0, 0)
                let expr_component_mpos := extract_returndata()
                let expr := mload(expr_component_mpos)
                if lt(expr, 0x20)
                {
                    var := 0
                    leave
                }
                let expr_1 := expr_component
                if expr_component
                {
                    expr_1 := abi_decode_bool_fromMemory(add(expr_component_mpos, 0x20), add(add(expr_component_mpos, expr), 0x20))
                }
                var := expr_1
            }
            function fun_supportsERC165Interface_7799(var_account) -> var
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, shl(224, 0x01ffc9a7))
                mstore(add(expr_mpos, 36), shl(224, 0xffffffff))
                mstore(expr_mpos, 36)
                finalize_allocation_13799(expr_mpos)
                let expr_component := staticcall(0x7530, var_account, _1, mload(expr_mpos), 0, 0)
                let expr_component_mpos := extract_returndata()
                let expr := mload(expr_component_mpos)
                if lt(expr, 0x20)
                {
                    var := 0
                    leave
                }
                let expr_1 := expr_component
                if expr_component
                {
                    expr_1 := abi_decode_bool_fromMemory(add(expr_component_mpos, 0x20), add(add(expr_component_mpos, expr), 0x20))
                }
                var := expr_1
            }
            function fun_supportsERC165Interface(var_account) -> var_
            {
                let expr_mpos := mload(64)
                let _1 := add(expr_mpos, 0x20)
                mstore(_1, shl(224, 0x01ffc9a7))
                mstore(add(expr_mpos, 36), shl(228, 0x041de683))
                mstore(expr_mpos, 36)
                finalize_allocation_13799(expr_mpos)
                let expr_component := staticcall(0x7530, var_account, _1, mload(expr_mpos), 0, 0)
                let expr_component_mpos := extract_returndata()
                let expr := mload(expr_component_mpos)
                if lt(expr, 0x20)
                {
                    var_ := 0
                    leave
                }
                let expr_1 := expr_component
                if expr_component
                {
                    expr_1 := abi_decode_bool_fromMemory(add(expr_component_mpos, 0x20), add(add(expr_component_mpos, expr), 0x20))
                }
                var_ := expr_1
            }
        }
        data ".metadata" hex"a3646970667358221220e500b6a25ba4797fd86e4f276fe5e7fe94ad43d36680e54ba23c27119e7573616c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
