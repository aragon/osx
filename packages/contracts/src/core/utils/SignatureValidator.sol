// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IDAO} from "../dao/IDAO.sol";

/// @title SignatureValidator
/// @author Aragon Association - 2023
/// @notice An [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature validator implementation to be used by multiple Aragon OSx DAOs.
/// @dev This contract assumes that incoming calls happen from DAOs having set this contract via the `setSignatureValidator(address)` function in `DAO.sol`.
contract SignatureValidator is IERC1271 {
    using ECDSA for bytes32;

    /// @notice The ID of the permission required for the signer signature to be accepted during execution time.
    bytes32 public constant SIGN_PERMISSION_ID = keccak256("SIGN_PERMISSION");

    /// @notice The internal constant storing the magic return value of a valid [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature.
    bytes4 internal constant VALID_SIGNATURE = 0x1626ba7e; // type(IERC1271).interfaceId = bytes4(keccak256("isValidSignature(bytes32,bytes)")

    /// @notice The internal constant storing the return value of an invalid [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) signature.
    bytes4 internal constant INVALID_SIGNATURE = 0xffffffff; // bytes4(uint32(type(uint32).max-1))

    /// @notice Returns whether the signature provided is valid for the provided data.
    /// @param _hash The hash of the data to be signed.
    /// @param _signature The signature byte array associated with hash.
    /// @dev For the signature to be valid, the `SIGN_PERMISSION_ID` permission must be granted to the signer on the calling DAO during execution time.
    function isValidSignature(
        bytes32 _hash,
        bytes calldata _signature
    ) external view returns (bytes4) {
        // We assume that this contract is an external call is relayed from the `isValidSignature(bytes32, bytes)` function of a DAO,
        // which has set this contract via the `setSignatureValidator(address)`.
        address dao = msg.sender;

        address signer = _hash.recover(_signature);

        if (
            IDAO(dao).hasPermission({
                _where: dao,
                _who: signer,
                _permissionId: SIGN_PERMISSION_ID,
                _data: ""
            })
        ) {
            return VALID_SIGNATURE;
        } else {
            return INVALID_SIGNATURE;
        }
    }
}
