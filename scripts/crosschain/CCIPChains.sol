// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @title CCIPChains
/// @notice Static registry of Chainlink CCIP chain metadata (chain selector,
///         Router, LINK) used by the cross-chain deployment/verification
///         scripts in this directory.
/// @dev VERIFIED ON-CHAIN 2026-07-21. Every `router`/`link` address below was
///      checked against the live CCIP v1.2/v1.5 Router deployments on the
///      date above. CCIP Router addresses are versioned and DO change as
///      Chainlink ships new lane versions or migrates a chain to a new
///      Router; this table is a deployment-time convenience, never a source
///      of truth at execution time.
///
///      OPERATORS MUST RE-VERIFY every entry against
///      https://docs.chain.link/ccip/directory immediately before any
///      mainnet deployment, `updateConfig` call, or `setChainSelectors` call
///      that relies on it. Do not extend this table's trust window past a
///      single deployment session.
library CCIPChains {
    /// @notice Thrown when `info`/`selectorOf`/`routerOf` is asked about a
    ///         chain id this registry has no entry for.
    error UnknownChain(uint256 chainId);

    /// @notice Static metadata for a single supported chain.
    /// @param chainId The standard EVM chain id.
    /// @param selector The CCIP chain selector (the bridge-native id CCIP
    ///        addresses lanes by; NOT the same number space as `chainId`).
    /// @param router The CCIP Router address on this chain.
    /// @param link The LINK token address on this chain, usable as an
    ///        alternative fee token to native currency.
    /// @param name Human-readable label, for console/log output only.
    struct ChainInfo {
        uint256 chainId;
        uint64 selector;
        address router;
        address link;
        string name;
    }

    /// @notice Returns the full metadata entry for a known chain id.
    /// @dev Implemented as a flat if-chain rather than a lookup table: this is
    ///      a `library` with only `internal pure` functions, so there is no
    ///      storage to seed at deploy time -- every entry must be a literal.
    /// @param chainId The standard EVM chain id.
    /// @return The chain's metadata.
    function info(uint256 chainId) internal pure returns (ChainInfo memory) {
        // ---------------------------------------------------------------
        // Mainnets
        // ---------------------------------------------------------------
        if (chainId == 1) {
            return ChainInfo({
                chainId: 1,
                selector: 5009297550715157269,
                router: 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D,
                link: 0x514910771AF9Ca656af840dff83E8264EcF986CA,
                name: "Ethereum Mainnet"
            });
        }
        if (chainId == 8453) {
            return ChainInfo({
                chainId: 8453,
                selector: 15971525489660198786,
                router: 0x881e3A65B4d4a04dD529061dd0071cf975F58bCD,
                link: 0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196,
                name: "Base Mainnet"
            });
        }
        if (chainId == 42161) {
            return ChainInfo({
                chainId: 42161,
                selector: 4949039107694359620,
                router: 0x141fa059441E0ca23ce184B6A78bafD2A517DdE8,
                link: 0xf97f4df75117a78c1A5a0DBb814Af92458539FB4,
                name: "Arbitrum One"
            });
        }
        if (chainId == 143) {
            return ChainInfo({
                chainId: 143,
                selector: 8481857512324358265,
                router: 0x33566fE5976AAa420F3d5C64996641Fc3858CaDB,
                link: 0x76f257B1DDA5cC71bee4eF637Fbdde4C801310A9,
                name: "Monad Mainnet"
            });
        }

        // ---------------------------------------------------------------
        // Testnets
        // ---------------------------------------------------------------
        if (chainId == 11155111) {
            return ChainInfo({
                chainId: 11155111,
                selector: 16015286601757825753,
                router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59,
                link: 0x779877A7B0D9E8603169DdbD7836e478b4624789,
                name: "Ethereum Sepolia"
            });
        }
        if (chainId == 84532) {
            return ChainInfo({
                chainId: 84532,
                selector: 10344971235874465080,
                router: 0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93,
                link: 0xE4aB69C077896252FAFBD49EFD26B5D171A32410,
                name: "Base Sepolia"
            });
        }
        if (chainId == 421614) {
            return ChainInfo({
                chainId: 421614,
                selector: 3478487238524512106,
                router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165,
                link: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E,
                name: "Arbitrum Sepolia"
            });
        }
        if (chainId == 10143) {
            return ChainInfo({
                chainId: 10143,
                selector: 2183018362218727504,
                router: 0x5aD0A67f4Da0E8665a3fbf15E4215A780407Cf33,
                link: 0xe5e3a4fF1773d043a387b16Ceb3c91cC49bAFD54,
                name: "Monad Testnet"
            });
        }

        revert UnknownChain(chainId);
    }

    /// @notice Whether `chainId` has an entry in this registry.
    /// @dev Does NOT revert, unlike `info`/`selectorOf`/`routerOf`; callers
    ///      that want a boolean check without a `try/catch` should use this
    ///      instead of catching `UnknownChain`.
    /// @param chainId The standard EVM chain id.
    /// @return True if `info(chainId)` would succeed.
    function isKnown(uint256 chainId) internal pure returns (bool) {
        return
            chainId == 1 ||
            chainId == 8453 ||
            chainId == 42161 ||
            chainId == 143 ||
            chainId == 11155111 ||
            chainId == 84532 ||
            chainId == 421614 ||
            chainId == 10143;
    }

    /// @notice The CCIP chain selector for a known chain id.
    /// @param chainId The standard EVM chain id.
    /// @return The CCIP chain selector.
    function selectorOf(uint256 chainId) internal pure returns (uint64) {
        return info(chainId).selector;
    }

    /// @notice The CCIP Router address for a known chain id.
    /// @param chainId The standard EVM chain id.
    /// @return The CCIP Router address.
    function routerOf(uint256 chainId) internal pure returns (address) {
        return info(chainId).router;
    }
}
