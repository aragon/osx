// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IDAO} from "../dao/IDAO.sol";

/// @notice An ERC-1271 signature validator implementation to be used by Aragon OSx DAO.
contract SignatureValidator is IERC1271 {
    using ECDSA for bytes32;

    /// @notice The ID of the permission required to call the `execute` function.
    bytes32 public constant SIGN_PERMISSION_ID = keccak256("SIGN_PERMISSION");

    bytes4 internal constant VALID_EIP1271_SIGNATURE = 0x1626ba7e; // type(IERC1271).interfaceId = bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 internal constant INVALID_SIGNATURE = 0xffffffff; // bytes4(uint32(type(uint32).max-1))

    function isValidSignature(
        bytes32 _messageHash,
        bytes calldata _signature
    ) external view returns (bytes4) {
        address dao = msg.sender; // This holds because DAO has set the signature validator itself via `setSignatureValidator` and calls it via `isValidSignature`.
        address signer = _messageHash.recover(_signature);

        bool isValid = IDAO(dao).hasPermission({
            _where: dao,
            _who: signer,
            _permissionId: SIGN_PERMISSION_ID,
            _data: ""
        });

        if (isValid) {
            return VALID_EIP1271_SIGNATURE;
        } else {
            return INVALID_SIGNATURE;
        }
    }
}
