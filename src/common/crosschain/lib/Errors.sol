// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

library Errors {
    error NOT_ENOUGH_TO_PAY_BRIDGE();
    error RECEIVER_ADDRESS_ZERO();
    error CALLER_NOT_CCIP_ROUTER();
    error INVALID_LENGTH_MISMATCH();
    error TRUSTED_REMOTE_NOT_SET();
    error REMOTE_NOT_TRUSTED();
    error SEND_MESSAGE_TO_ADAPTER_FAILED(bytes reason);
}
