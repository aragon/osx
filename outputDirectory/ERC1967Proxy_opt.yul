/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 29:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol", 30:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol", 31:"@openzeppelin/contracts/proxy/Proxy.sol", 39:"@openzeppelin/contracts/utils/Address.sol", 41:"@openzeppelin/contracts/utils/StorageSlot.sol"
object "ERC1967Proxy_6204" {
    code {
        {
            mstore(64, 128)
            let programSize := datasize("ERC1967Proxy_6204")
            let argSize := sub(codesize(), programSize)
            let memoryDataOffset := allocate_memory(argSize)
            codecopy(memoryDataOffset, programSize, argSize)
            let _1 := add(memoryDataOffset, argSize)
            if slt(sub(_1, memoryDataOffset), 64) { revert(0, 0) }
            let value := mload(memoryDataOffset)
            if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
            let offset := mload(add(memoryDataOffset, 32))
            if gt(offset, sub(shl(64, 1), 1)) { revert(0, 0) }
            let _2 := add(memoryDataOffset, offset)
            if iszero(slt(add(_2, 0x1f), _1)) { revert(0, 0) }
            let _3 := mload(_2)
            let array := allocate_memory(array_allocation_size_bytes(_3))
            mstore(array, _3)
            if gt(add(add(_2, _3), 32), _1) { revert(0, 0) }
            copy_memory_to_memory(add(_2, 32), add(array, 32), _3)
            fun_upgradeToAndCall(value, array)
            let _4 := mload(64)
            let _5 := datasize("ERC1967Proxy_6204_deployed")
            codecopy(_4, dataoffset("ERC1967Proxy_6204_deployed"), _5)
            return(_4, _5)
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
        function array_allocation_size_bytes(length) -> size
        {
            if gt(length, sub(shl(64, 1), 1)) { panic_error_0x41() }
            size := add(and(add(length, 31), not(31)), 0x20)
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
        function fun_upgradeToAndCall(var_newImplementation, var_data_mpos)
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
            sstore(_1, or(and(sload(_1), not(sub(shl(160, 1), 1))), and(var_newImplementation, sub(shl(160, 1), 1))))
            log2(mload(64), 0x00, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
            let _2 := iszero(mload(var_data_mpos))
            let expr := iszero(_2)
            if _2 { expr := 0x00 }
            if expr
            {
                pop(fun_functionDelegateCall(var_newImplementation, var_data_mpos, copy_literal_to_memory_9fdcd12e4b726339b32a442b0a448365d5d85c96b2d2cff917b4f66c63110398()))
            }
        }
        function copy_literal_to_memory_9fdcd12e4b726339b32a442b0a448365d5d85c96b2d2cff917b4f66c63110398() -> memPtr
        {
            let memPtr_1 := mload(64)
            let newFreePtr := add(memPtr_1, 96)
            if or(gt(newFreePtr, sub(shl(64, 1), 1)), lt(newFreePtr, memPtr_1)) { panic_error_0x41() }
            mstore(64, newFreePtr)
            mstore(memPtr_1, 39)
            memPtr := memPtr_1
            mstore(add(memPtr_1, 32), "Address: low-level delegate call")
            mstore(add(memPtr_1, 64), " failed")
        }
        function fun_functionDelegateCall(var_target, var_data_4540_mpos, var_errorMessage_mpos) -> var_mpos
        {
            if iszero(extcodesize(var_target))
            {
                let memPtr := mload(64)
                mstore(memPtr, shl(229, 4594637))
                mstore(add(memPtr, 4), 32)
                mstore(add(memPtr, 36), 38)
                mstore(add(memPtr, 68), "Address: delegate call to non-co")
                mstore(add(memPtr, 100), "ntract")
                revert(memPtr, 132)
            }
            let expr_component := delegatecall(gas(), var_target, add(var_data_4540_mpos, 0x20), mload(var_data_4540_mpos), 0, 0)
            let data := 0
            switch returndatasize()
            case 0 { data := 96 }
            default {
                let _1 := returndatasize()
                let memPtr_1 := allocate_memory(array_allocation_size_bytes(_1))
                mstore(memPtr_1, _1)
                data := memPtr_1
                returndatacopy(add(memPtr_1, 0x20), 0, returndatasize())
            }
            var_mpos := fun_verifyCallResult(expr_component, data, var_errorMessage_mpos)
        }
        function fun_verifyCallResult(var_success, var_returndata_mpos, var_errorMessage_4577_mpos) -> var__mpos
        {
            var__mpos := 96
            switch var_success
            case 0 {
                switch iszero(iszero(mload(var_returndata_mpos)))
                case 0 {
                    let _1 := mload(64)
                    mstore(_1, shl(229, 4594637))
                    mstore(add(_1, 4), 32)
                    let length := mload(var_errorMessage_4577_mpos)
                    mstore(add(_1, 36), length)
                    copy_memory_to_memory(add(var_errorMessage_4577_mpos, 32), add(_1, 68), length)
                    revert(_1, add(sub(add(_1, and(add(length, 31), not(31))), _1), 68))
                }
                default {
                    revert(add(32, var_returndata_mpos), mload(var_returndata_mpos))
                }
            }
            default {
                var__mpos := var_returndata_mpos
                leave
            }
        }
    }
    /// @use-src 29:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol", 30:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol", 31:"@openzeppelin/contracts/proxy/Proxy.sol", 41:"@openzeppelin/contracts/utils/StorageSlot.sol"
    object "ERC1967Proxy_6204_deployed" {
        code {
            {
                mstore(64, 128)
                if iszero(calldatasize())
                {
                    let value := and(sload(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc), sub(shl(160, 1), 1))
                    let _1 := 0
                    calldatacopy(_1, _1, calldatasize())
                    let usr$result := delegatecall(gas(), value, _1, calldatasize(), _1, _1)
                    returndatacopy(_1, _1, returndatasize())
                    switch usr$result
                    case 0 { revert(_1, returndatasize()) }
                    default { return(_1, returndatasize()) }
                }
                let value_1 := and(sload(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc), sub(shl(160, 1), 1))
                let _2 := 0
                calldatacopy(_2, _2, calldatasize())
                let usr$result_1 := delegatecall(gas(), value_1, _2, calldatasize(), _2, _2)
                returndatacopy(_2, _2, returndatasize())
                switch usr$result_1
                case 0 { revert(_2, returndatasize()) }
                default { return(_2, returndatasize()) }
            }
        }
        data ".metadata" hex"a3646970667358221220540d17f7ec27feca0fdb6b637a4384f0558687807e06e3eab5d7f06c892de6a76c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
