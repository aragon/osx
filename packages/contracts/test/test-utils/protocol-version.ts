// The current protocol version number as specified by the `getProtocolVersion()` function in `ProtocolVersion.sol`.
export const CURRENT_PROTOCOL_VERSION: [number, number, number] = [1, 4, 0];

// The protocol version number of contracts not having a `getProtocolVersion()` function because they don't inherit from `ProtocolVersion.sol` yet.
export const IMPLICIT_INITIAL_PROTOCOL_VERSION: [number, number, number] = [
  1, 0, 0,
];
