/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 34:"@openzeppelin/contracts/token/ERC20/ERC20.sol", 35:"@openzeppelin/contracts/token/ERC20/IERC20.sol", 36:"@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol", 40:"@openzeppelin/contracts/utils/Context.sol"
object "ERC20_4026" {
    code {
        {
            mstore(64, memoryguard(0x80))
            if callvalue() { revert(0, 0) }
            let programSize := datasize("ERC20_4026")
            let argSize := sub(codesize(), programSize)
            let memoryDataOffset := allocate_memory(argSize)
            codecopy(memoryDataOffset, programSize, argSize)
            let _1 := add(memoryDataOffset, argSize)
            if slt(sub(_1, memoryDataOffset), 64) { revert(0, 0) }
            let offset := mload(memoryDataOffset)
            let _2 := sub(shl(64, 1), 1)
            if gt(offset, _2) { revert(0, 0) }
            let value0 := abi_decode_string_fromMemory(add(memoryDataOffset, offset), _1)
            let _3 := 32
            let offset_1 := mload(add(memoryDataOffset, _3))
            if gt(offset_1, _2) { revert(0, 0) }
            let _4 := abi_decode_string_fromMemory(add(memoryDataOffset, offset_1), _1)
            let newLen := mload(value0)
            if gt(newLen, _2) { panic_error_0x41() }
            clean_up_bytearray_end_slots_string_storage(extract_byte_array_length(sload(0x03)), newLen)
            let srcOffset := 0
            srcOffset := _3
            switch gt(newLen, 31)
            case 1 {
                let loopEnd := and(newLen, not(31))
                let dstPtr := array_dataslot_string_storage_998()
                let i := 0
                for { } lt(i, loopEnd) { i := add(i, _3) }
                {
                    sstore(dstPtr, mload(add(value0, srcOffset)))
                    dstPtr := add(dstPtr, 1)
                    srcOffset := add(srcOffset, _3)
                }
                if lt(loopEnd, newLen)
                {
                    let lastValue := mload(add(value0, srcOffset))
                    sstore(dstPtr, and(lastValue, not(shr(and(shl(0x03, newLen), 248), not(0)))))
                }
                sstore(0x03, add(shl(1, newLen), 1))
            }
            default {
                let value := 0
                if newLen
                {
                    value := mload(add(value0, srcOffset))
                }
                sstore(0x03, extract_used_part_and_set_length_of_short_byte_array(value, newLen))
            }
            copy_byte_array_to_storage_from_string_to_string(_4)
            let _5 := mload(64)
            let _6 := datasize("ERC20_4026_deployed")
            codecopy(_5, dataoffset("ERC20_4026_deployed"), _6)
            return(_5, _6)
        }
        function panic_error_0x41()
        {
            mstore(0, shl(224, 0x4e487b71))
            mstore(4, 0x41)
            revert(0, 0x24)
        }
        function allocate_memory(size) -> memPtr
        {
            memPtr := mload(64)
            let newFreePtr := add(memPtr, and(add(size, 31), not(31)))
            if or(gt(newFreePtr, sub(shl(64, 1), 1)), lt(newFreePtr, memPtr)) { panic_error_0x41() }
            mstore(64, newFreePtr)
        }
        function abi_decode_string_fromMemory(offset, end) -> array
        {
            if iszero(slt(add(offset, 0x1f), end)) { revert(0, 0) }
            let _1 := mload(offset)
            if gt(_1, sub(shl(64, 1), 1)) { panic_error_0x41() }
            let _2 := 0x20
            let array_1 := allocate_memory(add(and(add(_1, 0x1f), not(31)), _2))
            mstore(array_1, _1)
            if gt(add(add(offset, _1), _2), end) { revert(0, 0) }
            let i := 0
            for { } lt(i, _1) { i := add(i, _2) }
            {
                mstore(add(add(array_1, i), _2), mload(add(add(offset, i), _2)))
            }
            if gt(i, _1)
            {
                mstore(add(add(array_1, _1), _2), 0)
            }
            array := array_1
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
        function array_dataslot_string_storage_998() -> data
        {
            mstore(0, 0x03)
            data := keccak256(0, 0x20)
        }
        function array_dataslot_string_storage() -> data
        {
            mstore(0, 0x04)
            data := keccak256(0, 0x20)
        }
        function clean_up_bytearray_end_slots_string_storage(len, startIndex)
        {
            if gt(len, 31)
            {
                let _1 := 0
                mstore(_1, 0x03)
                let data := keccak256(_1, 0x20)
                let deleteStart := add(data, shr(5, add(startIndex, 31)))
                if lt(startIndex, 0x20) { deleteStart := data }
                let _2 := add(data, shr(5, add(len, 31)))
                let start := deleteStart
                for { } lt(start, _2) { start := add(start, 1) }
                { sstore(start, _1) }
            }
        }
        function clean_up_bytearray_end_slots_string_storage_1902(len, startIndex)
        {
            if gt(len, 31)
            {
                let _1 := 0
                mstore(_1, 0x04)
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
        function copy_byte_array_to_storage_from_string_to_string(src)
        {
            let newLen := mload(src)
            if gt(newLen, sub(shl(64, 1), 1)) { panic_error_0x41() }
            clean_up_bytearray_end_slots_string_storage_1902(extract_byte_array_length(sload(0x04)), newLen)
            let srcOffset := 0
            let srcOffset_1 := 0x20
            srcOffset := srcOffset_1
            switch gt(newLen, 31)
            case 1 {
                let loopEnd := and(newLen, not(31))
                let dstPtr := array_dataslot_string_storage()
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
                sstore(0x04, add(shl(1, newLen), 1))
            }
            default {
                let value := 0
                if newLen
                {
                    value := mload(add(src, srcOffset))
                }
                sstore(0x04, extract_used_part_and_set_length_of_short_byte_array(value, newLen))
            }
        }
    }
    /// @use-src 34:"@openzeppelin/contracts/token/ERC20/ERC20.sol", 40:"@openzeppelin/contracts/utils/Context.sol"
    object "ERC20_4026_deployed" {
        code {
            {
                let _1 := 64
                mstore(_1, memoryguard(0x80))
                if iszero(lt(calldatasize(), 4))
                {
                    let _2 := 0
                    switch shr(224, calldataload(_2))
                    case 0x06fdde03 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let converted := copy_array_from_storage_to_memory_string()
                        let memPos := mload(_1)
                        return(memPos, sub(abi_encode_string(memPos, converted), memPos))
                    }
                    case 0x095ea7b3 {
                        if callvalue() { revert(_2, _2) }
                        let param, param_1 := abi_decode_addresst_uint256(calldatasize())
                        let ret := fun_approve_3607(param, param_1)
                        let memPos_1 := mload(_1)
                        return(memPos_1, sub(abi_encode_bool(memPos_1, ret), memPos_1))
                    }
                    case 0x18160ddd {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let _3 := sload(0x02)
                        let memPos_2 := mload(_1)
                        return(memPos_2, sub(abi_encode_uint256(memPos_2, _3), memPos_2))
                    }
                    case 0x23b872dd {
                        if callvalue() { revert(_2, _2) }
                        let param_2, param_3, param_4 := abi_decode_addresst_addresst_uint256(calldatasize())
                        let ret_1 := fun_transferFrom(param_2, param_3, param_4)
                        let memPos_3 := mload(_1)
                        return(memPos_3, sub(abi_encode_bool(memPos_3, ret_1), memPos_3))
                    }
                    case 0x313ce567 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let memPos_4 := mload(_1)
                        return(memPos_4, sub(abi_encode_uint8(memPos_4), memPos_4))
                    }
                    case 0x39509351 {
                        if callvalue() { revert(_2, _2) }
                        let param_5, param_6 := abi_decode_addresst_uint256(calldatasize())
                        let ret_2 := fun_increaseAllowance(param_5, param_6)
                        let memPos_5 := mload(_1)
                        return(memPos_5, sub(abi_encode_bool(memPos_5, ret_2), memPos_5))
                    }
                    case 0x70a08231 {
                        if callvalue() { revert(_2, _2) }
                        let ret_3 := fun_balanceOf(abi_decode_address(calldatasize()))
                        let memPos_6 := mload(_1)
                        return(memPos_6, sub(abi_encode_uint256(memPos_6, ret_3), memPos_6))
                    }
                    case 0x95d89b41 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode(calldatasize())
                        let converted_1 := copy_array_from_storage_to_memory_string_2457()
                        let memPos_7 := mload(_1)
                        return(memPos_7, sub(abi_encode_string(memPos_7, converted_1), memPos_7))
                    }
                    case 0xa457c2d7 {
                        if callvalue() { revert(_2, _2) }
                        let param_7, param_8 := abi_decode_addresst_uint256(calldatasize())
                        let ret_4 := fun_decreaseAllowance(param_7, param_8)
                        let memPos_8 := mload(_1)
                        return(memPos_8, sub(abi_encode_bool(memPos_8, ret_4), memPos_8))
                    }
                    case 0xa9059cbb {
                        if callvalue() { revert(_2, _2) }
                        let param_9, param_10 := abi_decode_addresst_uint256(calldatasize())
                        let ret_5 := fun_transfer_3564(param_9, param_10)
                        let memPos_9 := mload(_1)
                        return(memPos_9, sub(abi_encode_bool(memPos_9, ret_5), memPos_9))
                    }
                    case 0xdd62ed3e {
                        if callvalue() { revert(_2, _2) }
                        let param_11, param_12 := abi_decode_addresst_address(calldatasize())
                        let _4 := sload(mapping_index_access_mapping_address_uint256_of_address(mapping_index_access_mapping_address_uint256_of_address_2461(param_11), param_12))
                        let memPos_10 := mload(_1)
                        return(memPos_10, sub(abi_encode_uint256(memPos_10, _4), memPos_10))
                    }
                }
                revert(0, 0)
            }
            function abi_decode(dataEnd)
            {
                if slt(add(dataEnd, not(3)), 0) { revert(0, 0) }
            }
            function array_storeLengthForEncoding_string(pos, length) -> updated_pos
            {
                mstore(pos, length)
                updated_pos := add(pos, 0x20)
            }
            function abi_encode_string(headStart, value0) -> tail
            {
                let _1 := 32
                mstore(headStart, _1)
                let length := mload(value0)
                mstore(add(headStart, _1), length)
                let i := 0
                for { } lt(i, length) { i := add(i, _1) }
                {
                    mstore(add(add(headStart, i), 64), mload(add(add(value0, i), _1)))
                }
                if gt(i, length)
                {
                    mstore(add(add(headStart, length), 64), 0)
                }
                tail := add(add(headStart, and(add(length, 31), not(31))), 64)
            }
            function abi_decode_addresst_uint256(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
                value0 := value
                value1 := calldataload(36)
            }
            function abi_encode_bool(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, iszero(iszero(value0)))
            }
            function abi_encode_uint256(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, value0)
            }
            function abi_decode_addresst_addresst_uint256(dataEnd) -> value0, value1, value2
            {
                if slt(add(dataEnd, not(3)), 96) { revert(0, 0) }
                let value := calldataload(4)
                let _1 := sub(shl(160, 1), 1)
                if iszero(eq(value, and(value, _1))) { revert(0, 0) }
                value0 := value
                let value_1 := calldataload(36)
                if iszero(eq(value_1, and(value_1, _1))) { revert(0, 0) }
                value1 := value_1
                value2 := calldataload(68)
            }
            function abi_encode_uint8(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x12)
            }
            function abi_decode_address(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
                value0 := value
            }
            function abi_decode_addresst_address(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                let _1 := sub(shl(160, 1), 1)
                if iszero(eq(value, and(value, _1))) { revert(0, 0) }
                value0 := value
                let value_1 := calldataload(36)
                if iszero(eq(value_1, and(value_1, _1))) { revert(0, 0) }
                value1 := value_1
            }
            function array_dataslot_string_storage() -> data
            {
                mstore(0, 0x03)
                data := 87903029871075914254377627908054574944891091886930582284385770809450030037083
            }
            function array_dataslot_string_storage_4023() -> data
            {
                mstore(0, 4)
                data := 62514009886607029107290561805838585334079798074568712924583230797734656856475
            }
            function finalize_allocation(memPtr, size)
            {
                let newFreePtr := add(memPtr, and(add(size, 31), not(31)))
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr))
                {
                    mstore(0, shl(224, 0x4e487b71))
                    mstore(4, 0x41)
                    revert(0, 0x24)
                }
                mstore(64, newFreePtr)
            }
            function copy_array_from_storage_to_memory_string() -> memPtr
            {
                memPtr := mload(64)
                let ret := 0
                let slotValue := sload(0x03)
                let length := ret
                let _1 := 1
                length := shr(_1, slotValue)
                let outOfPlaceEncoding := and(slotValue, _1)
                if iszero(outOfPlaceEncoding) { length := and(length, 0x7f) }
                let _2 := 32
                if eq(outOfPlaceEncoding, lt(length, _2))
                {
                    mstore(ret, shl(224, 0x4e487b71))
                    mstore(4, 0x22)
                    revert(ret, 0x24)
                }
                let pos := array_storeLengthForEncoding_string(memPtr, length)
                switch outOfPlaceEncoding
                case 0 {
                    mstore(pos, and(slotValue, not(255)))
                    ret := add(pos, _2)
                }
                case 1 {
                    let dataPos := array_dataslot_string_storage()
                    let i := 0
                    for { } lt(i, length) { i := add(i, _2) }
                    {
                        mstore(add(pos, i), sload(dataPos))
                        dataPos := add(dataPos, _1)
                    }
                    ret := add(pos, i)
                }
                finalize_allocation(memPtr, sub(ret, memPtr))
            }
            function copy_array_from_storage_to_memory_string_2457() -> memPtr
            {
                memPtr := mload(64)
                let ret := 0
                let slotValue := sload(4)
                let length := ret
                let _1 := 1
                length := shr(_1, slotValue)
                let outOfPlaceEncoding := and(slotValue, _1)
                if iszero(outOfPlaceEncoding) { length := and(length, 0x7f) }
                let _2 := 32
                if eq(outOfPlaceEncoding, lt(length, _2))
                {
                    mstore(ret, shl(224, 0x4e487b71))
                    mstore(4, 0x22)
                    revert(ret, 0x24)
                }
                let pos := array_storeLengthForEncoding_string(memPtr, length)
                switch outOfPlaceEncoding
                case 0 {
                    mstore(pos, and(slotValue, not(255)))
                    ret := add(pos, _2)
                }
                case 1 {
                    let dataPos := array_dataslot_string_storage_4023()
                    let i := 0
                    for { } lt(i, length) { i := add(i, _2) }
                    {
                        mstore(add(pos, i), sload(dataPos))
                        dataPos := add(dataPos, _1)
                    }
                    ret := add(pos, i)
                }
                finalize_allocation(memPtr, sub(ret, memPtr))
            }
            function mapping_index_access_mapping_address_uint256_of_address_2461(key) -> dataSlot
            {
                mstore(0, and(key, sub(shl(160, 1), 1)))
                mstore(0x20, 0x01)
                dataSlot := keccak256(0, 0x40)
            }
            function mapping_index_access_mapping_address_uint256_of_address_2462(key) -> dataSlot
            {
                mstore(0x00, and(key, sub(shl(160, 1), 1)))
                mstore(0x20, 0x00)
                dataSlot := keccak256(0x00, 0x40)
            }
            function mapping_index_access_mapping_address_uint256_of_address(slot, key) -> dataSlot
            {
                mstore(0, and(key, sub(shl(160, 1), 1)))
                mstore(0x20, slot)
                dataSlot := keccak256(0, 0x40)
            }
            function fun_balanceOf(var_account) -> var
            {
                mstore(0x00, and(var_account, sub(shl(160, 1), 1)))
                mstore(0x20, 0x00)
                var := sload(keccak256(0x00, 0x40))
            }
            function fun_transfer_3564(var_to, var_amount) -> var
            {
                fun_transfer(caller(), var_to, var_amount)
                var := 0x01
            }
            function fun_approve_3607(var_spender, var_amount) -> var
            {
                fun_approve(caller(), var_spender, var_amount)
                var := 0x01
            }
            function fun_transferFrom(var_from, var_to, var_amount) -> var
            {
                mstore(0, and(var_from, sub(shl(160, 1), 1)))
                mstore(0x20, 0x01)
                let _1 := sload(mapping_index_access_mapping_address_uint256_of_address(keccak256(0, 0x40), caller()))
                if iszero(eq(_1, not(0)))
                {
                    if lt(_1, var_amount)
                    {
                        let memPtr := mload(0x40)
                        mstore(memPtr, shl(229, 4594637))
                        mstore(add(memPtr, 4), 0x20)
                        mstore(add(memPtr, 36), 29)
                        mstore(add(memPtr, 68), "ERC20: insufficient allowance")
                        revert(memPtr, 100)
                    }
                    fun_approve(var_from, caller(), sub(_1, var_amount))
                }
                fun_transfer(var_from, var_to, var_amount)
                var := 0x01
            }
            function checked_add_uint256(x, y) -> sum
            {
                if gt(x, not(y))
                {
                    mstore(0, shl(224, 0x4e487b71))
                    mstore(4, 0x11)
                    revert(0, 0x24)
                }
                sum := add(x, y)
            }
            function fun_increaseAllowance(var_spender, var_addedValue) -> var_
            {
                mstore(0, caller())
                mstore(0x20, 0x01)
                fun_approve(caller(), var_spender, checked_add_uint256(sload(mapping_index_access_mapping_address_uint256_of_address(keccak256(0, 0x40), var_spender)), var_addedValue))
                var_ := 0x01
            }
            function fun_decreaseAllowance(var_spender, var_subtractedValue) -> var
            {
                mstore(0, caller())
                mstore(0x20, 0x01)
                let _1 := sload(mapping_index_access_mapping_address_uint256_of_address(keccak256(0, 0x40), var_spender))
                if lt(_1, var_subtractedValue)
                {
                    let memPtr := mload(0x40)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 0x20)
                    mstore(add(memPtr, 36), 37)
                    mstore(add(memPtr, 68), "ERC20: decreased allowance below")
                    mstore(add(memPtr, 100), " zero")
                    revert(memPtr, 132)
                }
                fun_approve(caller(), var_spender, sub(_1, var_subtractedValue))
                var := 0x01
            }
            function require_helper_stringliteral(condition)
            {
                if iszero(condition)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 35)
                    mstore(add(memPtr, 68), "ERC20: transfer to the zero addr")
                    mstore(add(memPtr, 100), "ess")
                    revert(memPtr, 132)
                }
            }
            function require_helper_stringliteral_4107(condition)
            {
                if iszero(condition)
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 38)
                    mstore(add(memPtr, 68), "ERC20: transfer amount exceeds b")
                    mstore(add(memPtr, 100), "alance")
                    revert(memPtr, 132)
                }
            }
            function fun_transfer(var_from, var_to, var_amount)
            {
                let _1 := sub(shl(160, 1), 1)
                if iszero(and(var_from, _1))
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 37)
                    mstore(add(memPtr, 68), "ERC20: transfer from the zero ad")
                    mstore(add(memPtr, 100), "dress")
                    revert(memPtr, 132)
                }
                require_helper_stringliteral(iszero(iszero(and(var_to, _1))))
                let _2 := sload(mapping_index_access_mapping_address_uint256_of_address_2462(var_from))
                require_helper_stringliteral_4107(iszero(lt(_2, var_amount)))
                sstore(mapping_index_access_mapping_address_uint256_of_address_2462(var_from), sub(_2, var_amount))
                let _3 := mapping_index_access_mapping_address_uint256_of_address_2462(var_to)
                sstore(_3, checked_add_uint256(sload(_3), var_amount))
                let _4 := mload(64)
                log3(_4, sub(abi_encode_uint256(_4, var_amount), _4), 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef, var_from, var_to)
            }
            function fun_approve(var_owner, var_spender, var_amount)
            {
                let _1 := sub(shl(160, 1), 1)
                if iszero(and(var_owner, _1))
                {
                    let memPtr := mload(64)
                    mstore(memPtr, shl(229, 4594637))
                    mstore(add(memPtr, 4), 32)
                    mstore(add(memPtr, 36), 36)
                    mstore(add(memPtr, 68), "ERC20: approve from the zero add")
                    mstore(add(memPtr, 100), "ress")
                    revert(memPtr, 132)
                }
                if iszero(and(var_spender, _1))
                {
                    let memPtr_1 := mload(64)
                    mstore(memPtr_1, shl(229, 4594637))
                    mstore(add(memPtr_1, 4), 32)
                    mstore(add(memPtr_1, 36), 34)
                    mstore(add(memPtr_1, 68), "ERC20: approve to the zero addre")
                    mstore(add(memPtr_1, 100), "ss")
                    revert(memPtr_1, 132)
                }
                sstore(mapping_index_access_mapping_address_uint256_of_address(mapping_index_access_mapping_address_uint256_of_address_2461(var_owner), var_spender), var_amount)
                let _2 := mload(64)
                log3(_2, sub(abi_encode_uint256(_2, var_amount), _2), 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925, var_owner, var_spender)
            }
        }
        data ".metadata" hex"a3646970667358221220d84d8a6b3f5cdcc2693be37374e5e9d062b28529499a52c76a17ab4a8a334c5b6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
