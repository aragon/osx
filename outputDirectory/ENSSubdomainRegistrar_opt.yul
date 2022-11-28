/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/

/// @use-src 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 21:"@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol", 27:"@openzeppelin/contracts/interfaces/draft-IERC1822.sol", 30:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol", 33:"@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol", 49:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/DaoAuthorizableUpgradeable.sol", 51:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/bases/DaoAuthorizableBaseUpgradeable.sol", 65:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/registry/ens/ENSSubdomainRegistrar.sol"
object "ENSSubdomainRegistrar_6669" {
    code {
        {
            let _1 := memoryguard(0xa0)
            mstore(64, _1)
            if callvalue() { revert(0, 0) }
            mstore(128, address())
            let _2 := datasize("ENSSubdomainRegistrar_6669_deployed")
            codecopy(_1, dataoffset("ENSSubdomainRegistrar_6669_deployed"), _2)
            setimmutable(_1, "5901", mload(128))
            return(_1, _2)
        }
    }
    /// @use-src 18:"@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol", 20:"@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol", 21:"@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol", 30:"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol", 33:"@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol", 39:"@openzeppelin/contracts/utils/Address.sol", 41:"@openzeppelin/contracts/utils/StorageSlot.sol", 49:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/DaoAuthorizableUpgradeable.sol", 51:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/core/component/dao-authorizable/bases/DaoAuthorizableBaseUpgradeable.sol", 65:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/registry/ens/ENSSubdomainRegistrar.sol", 68:"Users/jordan/Desktop/Blockchain/Aragon/core/packages/contracts/contracts/utils/auth.sol"
    object "ENSSubdomainRegistrar_6669_deployed" {
        code {
            {
                let _1 := 64
                mstore(_1, 128)
                if iszero(lt(calldatasize(), 4))
                {
                    let _2 := 0
                    switch shr(224, calldataload(_2))
                    case 0x04f3bcec {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_5262(calldatasize())
                        return(128, add(abi_encode_address(and(sload(153), sub(shl(160, 1), 1))), not(127)))
                    }
                    case 0x3659cfe6 {
                        if callvalue() { revert(_2, _2) }
                        modifier_onlyProxy(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0x4f1ef286 {
                        let param, param_1 := abi_decode_addresst_bytes(calldatasize())
                        modifier_onlyProxy_5981(param, param_1)
                        return(mload(_1), _2)
                    }
                    case 0x52d1902d {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_5262(calldatasize())
                        let ret := modifier_notDelegated()
                        let memPos := mload(_1)
                        return(memPos, sub(abi_encode_bytes32(memPos, ret), memPos))
                    }
                    case 0x6133f985 {
                        if callvalue() { revert(_2, _2) }
                        let param_2, param_3, param_4 := abi_decode_contract_IDAOt_contract_ENSt_bytes32(calldatasize())
                        modifier_initializer(param_2, param_3, param_4)
                        return(mload(_1), _2)
                    }
                    case 0x89bb4145 {
                        if callvalue() { revert(_2, _2) }
                        let param_5, param_6 := abi_decode_bytes32t_address(calldatasize())
                        modifier_auth(param_5, param_6)
                        return(mload(_1), _2)
                    }
                    case 0x9848ba51 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_5262(calldatasize())
                        let memPos_1 := mload(_1)
                        return(memPos_1, sub(abi_encode_bytes32_5272(memPos_1), memPos_1))
                    }
                    case 0x985da726 {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_5262(calldatasize())
                        let ret_1 := and(sload(0x33), sub(shl(160, 1), 1))
                        let memPos_2 := mload(_1)
                        return(memPos_2, sub(abi_encode_contract_IDAO(memPos_2, ret_1), memPos_2))
                    }
                    case 0xaf7b2fed {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_5262(calldatasize())
                        let memPos_3 := mload(_1)
                        return(memPos_3, sub(abi_encode_bytes32_5276(memPos_3), memPos_3))
                    }
                    case 0xc66485b2 {
                        if callvalue() { revert(_2, _2) }
                        modifier_auth_6643(abi_decode_address(calldatasize()))
                        return(mload(_1), _2)
                    }
                    case 0xd70754ec {
                        if callvalue() { revert(_2, _2) }
                        abi_decode_5262(calldatasize())
                        let ret_2 := sload(152)
                        let memPos_4 := mload(_1)
                        return(memPos_4, sub(abi_encode_bytes32(memPos_4, ret_2), memPos_4))
                    }
                }
                revert(0, 0)
            }
            function abi_decode_5262(dataEnd)
            {
                if slt(add(dataEnd, not(3)), 0) { revert(0, 0) }
            }
            function abi_decode(headStart, dataEnd)
            {
                if slt(sub(dataEnd, headStart), 0) { revert(0, 0) }
            }
            function cleanup_address(value) -> cleaned
            {
                cleaned := and(value, sub(shl(160, 1), 1))
            }
            function abi_encode_address(value0) -> tail
            {
                tail := 160
                mstore(128, and(value0, sub(shl(160, 1), 1)))
            }
            function validator_revert_address(value)
            {
                if iszero(eq(value, and(value, sub(shl(160, 1), 1)))) { revert(0, 0) }
            }
            function abi_decode_address(dataEnd) -> value0
            {
                if slt(add(dataEnd, not(3)), 32) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
            }
            function panic_error_0x41()
            {
                mstore(0, shl(224, 0x4e487b71))
                mstore(4, 0x41)
                revert(0, 0x24)
            }
            function finalize_allocation_9359(memPtr)
            {
                let newFreePtr := add(memPtr, 0x20)
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }
            function finalize_allocation_9368(memPtr)
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
            function abi_decode_addresst_bytes(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                let value := calldataload(4)
                validator_revert_address(value)
                value0 := value
                let offset := calldataload(36)
                if gt(offset, 0xffffffffffffffff) { revert(0, 0) }
                if iszero(slt(add(offset, 35), dataEnd)) { revert(0, 0) }
                let _1 := calldataload(add(4, offset))
                let _2 := array_allocation_size_bytes(_1)
                let memPtr := mload(64)
                finalize_allocation(memPtr, _2)
                mstore(memPtr, _1)
                if gt(add(add(offset, _1), 36), dataEnd) { revert(0, 0) }
                calldatacopy(add(memPtr, 32), add(offset, 36), _1)
                mstore(add(add(memPtr, _1), 32), 0)
                value1 := memPtr
            }
            function abi_encode_bytes32_5272(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xbbdfd23f099d7ed9f535e0f97d2123efb1332b16e023b8359b3b879eaecd3c14)
            }
            function abi_encode_bytes32_5276(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0xa1fcba4efb1e94b7648f5e0504bfd39734aead5f17965d12705915d771c859ff)
            }
            function abi_encode_bytes32(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, value0)
            }
            function abi_decode_contract_IDAOt_contract_ENSt_bytes32(dataEnd) -> value0, value1, value2
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
            function abi_decode_bytes32t_address(dataEnd) -> value0, value1
            {
                if slt(add(dataEnd, not(3)), 64) { revert(0, 0) }
                value0 := calldataload(4)
                let value := calldataload(36)
                validator_revert_address(value)
                value1 := value
            }
            function abi_encode_contract_IDAO(headStart, value0) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, and(value0, sub(shl(160, 1), 1)))
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
                let cleaned := and(sload(0x33), _1)
                fun_auth_5280(cleaned, address(), caller(), calldatasize())
                let memPtr := mload(64)
                finalize_allocation_9359(memPtr)
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
            function modifier_onlyProxy_5981(var_newImplementation, var_data_mpos)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(loadimmutable("5901"), _1)
                require_helper_stringliteral_36e1(iszero(eq(address(), _2)))
                let _3 := 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
                require_helper_stringliteral_52f1(eq(and(sload(_3), _1), _2))
                let cleaned := and(sload(0x33), _1)
                fun_auth_5280(cleaned, address(), caller(), calldatasize())
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
                    fun_upgradeToAndCall_9361(var_newImplementation, var_data_mpos)
                }
                default {
                    fun_setImplementation(var_newImplementation)
                }
            }
            function update_storage_value_offsett_uint8_to_uint8()
            {
                sstore(0x00, or(and(sload(0x00), not(255)), 1))
            }
            function update_storage_value_offsett_bool_to_bool()
            {
                sstore(0x00, or(and(sload(0x00), not(65280)), 256))
            }
            function update_storage_value_offsett_bool_to_bool_5300()
            {
                sstore(0x00, and(sload(0x00), not(65280)))
            }
            function abi_encode_rational_by(headStart) -> tail
            {
                tail := add(headStart, 32)
                mstore(headStart, 0x01)
            }
            function modifier_initializer(var_managingDao_6510_address, var_ens_address, var_node)
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
                fun_initialize_inner(var_managingDao_6510_address, var_ens_address, var_node)
                if expr_1
                {
                    update_storage_value_offsett_bool_to_bool_5300()
                    let _2 := mload(64)
                    log1(_2, sub(abi_encode_rational_by(_2), _2), 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498)
                }
            }
            function update_storage_value_offsett_contract_ENS_to_contract_ENS_5302(value)
            {
                sstore(0x97, or(and(sload(0x97), shl(160, 0xffffffffffffffffffffffff)), and(value, sub(shl(160, 1), 1))))
            }
            function update_storage_value_offsett_contract_ENS_to_contract_ENS(value)
            {
                sstore(0x99, or(and(sload(0x99), shl(160, 0xffffffffffffffffffffffff)), and(value, sub(shl(160, 1), 1))))
            }
            function update_storage_value_offsett_bytes32_to_bytes32(value)
            { sstore(0x98, value) }
            function abi_decode_address_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let value := mload(headStart)
                validator_revert_address(value)
                value0 := value
            }
            function revert_forward()
            {
                let pos := mload(64)
                returndatacopy(pos, 0, returndatasize())
                revert(pos, returndatasize())
            }
            function abi_encode_bytes32_address(headStart, value0, value1) -> tail
            {
                tail := add(headStart, 64)
                mstore(headStart, value0)
                mstore(add(headStart, 32), and(value1, sub(shl(160, 1), 1)))
            }
            function fun_initialize_inner(var_managingDao_address, var__ens_address, var__node)
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
                sstore(0x33, or(and(sload(0x33), shl(160, 0xffffffffffffffffffffffff)), and(var_managingDao_address, _1)))
                update_storage_value_offsett_contract_ENS_to_contract_ENS_5302(var__ens_address)
                update_storage_value_offsett_bytes32_to_bytes32(var__node)
                let expr_6535_address := cleanup_address(cleanup_address(sload(0x97)))
                let _2 := mload(64)
                mstore(_2, shl(224, 0x0178b8bf))
                let _3 := staticcall(gas(), expr_6535_address, _2, sub(abi_encode_bytes32(add(_2, 4), var__node), _2), _2, 32)
                if iszero(_3) { revert_forward() }
                let expr := 0x00
                if _3
                {
                    finalize_allocation(_2, returndatasize())
                    expr := abi_decode_address_fromMemory(_2, add(_2, returndatasize()))
                }
                if iszero(and(expr, _1))
                {
                    let _4 := mload(64)
                    mstore(_4, shl(225, 0x0d7097c5))
                    revert(_4, sub(abi_encode_bytes32_address(add(_4, 4), var__node, expr), _4))
                }
                update_storage_value_offsett_contract_ENS_to_contract_ENS(expr)
            }
            function modifier_auth(var_label, var_targetAddress)
            {
                let _1 := sub(shl(160, 1), 1)
                let cleaned := and(sload(0x33), _1)
                fun_auth(cleaned, address(), caller(), calldatasize())
                let _2 := sload(0x98)
                let _3 := 64
                let expr_mpos := mload(_3)
                let _4 := add(expr_mpos, 0x20)
                let _5 := sub(abi_encode_packed_bytes32_bytes32(_4, _2, var_label), expr_mpos)
                mstore(expr_mpos, add(_5, not(31)))
                finalize_allocation(expr_mpos, _5)
                let expr := keccak256(_4, mload(expr_mpos))
                let expr_address := cleanup_address(cleanup_address(sload(0x97)))
                let _6 := mload(_3)
                mstore(_6, shl(224, 0x02571be3))
                let _7 := staticcall(gas(), expr_address, _6, sub(abi_encode_bytes32(add(_6, 4), expr), _6), _6, 0x20)
                if iszero(_7) { revert_forward() }
                let expr_1 := 0
                if _7
                {
                    finalize_allocation(_6, returndatasize())
                    expr_1 := abi_decode_address_fromMemory(_6, add(_6, returndatasize()))
                }
                if iszero(iszero(and(expr_1, _1)))
                {
                    let _8 := mload(_3)
                    mstore(_8, shl(225, 16559453))
                    revert(_8, sub(abi_encode_bytes32_address(add(_8, 4), expr, expr_1), _8))
                }
                let _9 := mload(_3)
                mstore(_9, shl(224, 0x06ab5923))
                let _10 := call(gas(), expr_address, 0, _9, sub(abi_encode_bytes32_bytes32_address(add(_9, 4), _2, var_label, address()), _9), _9, 0x20)
                if iszero(_10) { revert_forward() }
                if _10
                {
                    finalize_allocation(_9, returndatasize())
                    pop(abi_decode_bytes32_fromMemory(_9, add(_9, returndatasize())))
                }
                let expr_address_1 := cleanup_address(cleanup_address(sload(0x97)))
                let _11 := cleanup_address(sload(0x99))
                if iszero(extcodesize(expr_address_1)) { revert(0, 0) }
                let _12 := mload(_3)
                mstore(_12, shl(225, 0x0c4b7b85))
                let _13 := call(gas(), expr_address_1, 0, _12, sub(abi_encode_bytes32_address(add(_12, 4), expr, _11), _12), _12, 0)
                if iszero(_13) { revert_forward() }
                if _13
                {
                    finalize_allocation(_12, returndatasize())
                    abi_decode(_12, add(_12, returndatasize()))
                }
                let expr_address_2 := cleanup_address(cleanup_address(cleanup_address(sload(0x99))))
                if iszero(extcodesize(expr_address_2)) { revert(0, 0) }
                let _14 := mload(_3)
                mstore(_14, shl(232, 14023211))
                let _15 := call(gas(), expr_address_2, 0, _14, sub(abi_encode_bytes32_address(add(_14, 4), expr, var_targetAddress), _14), _14, 0)
                if iszero(_15) { revert_forward() }
                if _15
                {
                    finalize_allocation(_14, returndatasize())
                    abi_decode(_14, add(_14, returndatasize()))
                }
            }
            function abi_encode_packed_bytes32_bytes32(pos, value0, value1) -> end
            {
                mstore(pos, value0)
                mstore(add(pos, 32), value1)
                end := add(pos, 64)
            }
            function abi_decode_bytes32_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                value0 := mload(headStart)
            }
            function abi_encode_bytes32_bytes32_address(headStart, value0, value1, value2) -> tail
            {
                tail := add(headStart, 96)
                mstore(headStart, value0)
                mstore(add(headStart, 32), value1)
                mstore(add(headStart, 64), and(value2, sub(shl(160, 1), 1)))
            }
            function modifier_auth_6643(var_resolver)
            {
                let _1 := sub(shl(160, 1), 1)
                let cleaned := and(sload(0x33), _1)
                fun_auth(cleaned, address(), caller(), calldatasize())
                let _2 := and(var_resolver, _1)
                if iszero(_2)
                {
                    let _3 := sload(0x98)
                    let _4 := mload(64)
                    mstore(_4, shl(225, 0x0d7097c5))
                    revert(_4, sub(abi_encode_bytes32_address(add(_4, 4), _3, var_resolver), _4))
                }
                sstore(0x99, or(and(sload(0x99), shl(160, 0xffffffffffffffffffffffff)), _2))
            }
            function abi_decode_bool_fromMemory(headStart, dataEnd) -> value0
            {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }
                let value := mload(headStart)
                if iszero(eq(value, iszero(iszero(value)))) { revert(0, 0) }
                value0 := value
            }
            function abi_encode_address_address_address_address_bytes32(headStart, value0, value1, value2, value3) -> tail
            {
                tail := add(headStart, 160)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), and(value2, _1))
                mstore(add(headStart, 96), and(value3, _1))
                mstore(add(headStart, 128), 0xa1fcba4efb1e94b7648f5e0504bfd39734aead5f17965d12705915d771c859ff)
            }
            function abi_encode_address_address_address_address_bytes32_9364(headStart, value0, value1, value2, value3) -> tail
            {
                tail := add(headStart, 160)
                let _1 := sub(shl(160, 1), 1)
                mstore(headStart, and(value0, _1))
                mstore(add(headStart, 32), and(value1, _1))
                mstore(add(headStart, 64), and(value2, _1))
                mstore(add(headStart, 96), and(value3, _1))
                mstore(add(headStart, 128), 0xbbdfd23f099d7ed9f535e0f97d2123efb1332b16e023b8359b3b879eaecd3c14)
            }
            function fun_auth_5280(var_dao_address, var_addressThis, var_msgSender, var_msgData_length)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(var_dao_address, _1)
                let _3 := mload(64)
                mstore(_3, shl(225, 0x7ef7c883))
                mstore(add(_3, 4), and(var_addressThis, _1))
                mstore(add(_3, 36), and(var_msgSender, _1))
                mstore(add(_3, 68), 0xa1fcba4efb1e94b7648f5e0504bfd39734aead5f17965d12705915d771c859ff)
                mstore(add(_3, 100), 128)
                mstore(add(_3, 132), var_msgData_length)
                calldatacopy(add(_3, 164), 0, var_msgData_length)
                mstore(add(add(_3, var_msgData_length), 164), 0)
                let _4 := staticcall(gas(), _2, _3, add(sub(add(_3, and(add(var_msgData_length, 31), not(31))), _3), 164), _3, 32)
                if iszero(_4) { revert_forward() }
                let expr := 0
                if _4
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(expr)
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0x5caaf893))
                    revert(_5, sub(abi_encode_address_address_address_address_bytes32(add(_5, 4), _2, var_addressThis, var_addressThis, var_msgSender), _5))
                }
            }
            function fun_auth(var_dao_address, var_addressThis, var_msgSender, var_msgData_length)
            {
                let _1 := sub(shl(160, 1), 1)
                let _2 := and(var_dao_address, _1)
                let _3 := mload(64)
                mstore(_3, shl(225, 0x7ef7c883))
                mstore(add(_3, 4), and(var_addressThis, _1))
                mstore(add(_3, 36), and(var_msgSender, _1))
                mstore(add(_3, 68), 0xbbdfd23f099d7ed9f535e0f97d2123efb1332b16e023b8359b3b879eaecd3c14)
                mstore(add(_3, 100), 128)
                mstore(add(_3, 132), var_msgData_length)
                calldatacopy(add(_3, 164), 0, var_msgData_length)
                mstore(add(add(_3, var_msgData_length), 164), 0)
                let _4 := staticcall(gas(), _2, _3, add(sub(add(_3, and(add(var_msgData_length, 31), not(31))), _3), 164), _3, 32)
                if iszero(_4) { revert_forward() }
                let expr := 0
                if _4
                {
                    finalize_allocation(_3, returndatasize())
                    expr := abi_decode_bool_fromMemory(_3, add(_3, returndatasize()))
                }
                if iszero(expr)
                {
                    let _5 := mload(64)
                    mstore(_5, shl(224, 0x5caaf893))
                    revert(_5, sub(abi_encode_address_address_address_address_bytes32_9364(add(_5, 4), _2, var_addressThis, var_addressThis, var_msgSender), _5))
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
            function fun_upgradeToAndCall(var_newImplementation, var_data_mpos)
            {
                fun_setImplementation(var_newImplementation)
                let _1 := mload(64)
                let _2 := 0
                log2(_1, _2, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
                let _3 := iszero(mload(var_data_mpos))
                let expr := iszero(_3)
                if _3 { expr := _2 }
                if expr
                {
                    finalize_allocation_9368(_1)
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
                    let expr_component := delegatecall(gas(), var_newImplementation, add(var_data_mpos, 32), mload(var_data_mpos), _2, _2)
                    let data := _2
                    switch returndatasize()
                    case 0 { data := 96 }
                    default {
                        let _4 := returndatasize()
                        let _5 := array_allocation_size_bytes(_4)
                        let memPtr_1 := mload(64)
                        finalize_allocation(memPtr_1, _5)
                        mstore(memPtr_1, _4)
                        data := memPtr_1
                        returndatacopy(add(memPtr_1, 32), _2, returndatasize())
                    }
                    pop(fun_verifyCallResult(expr_component, data, _1))
                }
            }
            function fun_upgradeToAndCall_9361(var_newImplementation, var_data_mpos)
            {
                fun_setImplementation(var_newImplementation)
                let _1 := mload(64)
                log2(_1, 0, 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b, var_newImplementation)
                let _2 := iszero(mload(var_data_mpos))
                let expr := iszero(_2)
                if _2 { expr := 0x01 }
                if expr
                {
                    finalize_allocation_9368(_1)
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
                    let data := 0
                    switch returndatasize()
                    case 0 { data := 96 }
                    default {
                        let _3 := returndatasize()
                        let _4 := array_allocation_size_bytes(_3)
                        let memPtr_1 := mload(64)
                        finalize_allocation(memPtr_1, _4)
                        mstore(memPtr_1, _3)
                        data := memPtr_1
                        returndatacopy(add(memPtr_1, 32), 0, returndatasize())
                    }
                    pop(fun_verifyCallResult(expr_component, data, _1))
                }
            }
            function fun_verifyCallResult(var_success, var_returndata_mpos, var_errorMessage_mpos) -> var_mpos
            {
                var_mpos := 96
                switch var_success
                case 0 {
                    switch iszero(iszero(mload(var_returndata_mpos)))
                    case 0 {
                        let _1 := mload(64)
                        mstore(_1, shl(229, 4594637))
                        let _2 := 32
                        mstore(add(_1, 4), _2)
                        let length := mload(var_errorMessage_mpos)
                        mstore(add(_1, 36), length)
                        let i := 0x00
                        for { } lt(i, length) { i := add(i, _2) }
                        {
                            mstore(add(add(_1, i), 68), mload(add(add(var_errorMessage_mpos, i), _2)))
                        }
                        if gt(i, length)
                        {
                            mstore(add(add(_1, length), 68), 0x00)
                        }
                        revert(_1, add(sub(add(_1, and(add(length, 31), not(31))), _1), 68))
                    }
                    default {
                        revert(add(32, var_returndata_mpos), mload(var_returndata_mpos))
                    }
                }
                default {
                    var_mpos := var_returndata_mpos
                    leave
                }
            }
        }
        data ".metadata" hex"a3646970667358221220cb3c41d1a4edad635383458c21dd849207ce73a4c51c7bea7bdd366abe143dfa6c6578706572696d656e74616cf564736f6c634300080a0041"
    }
}
