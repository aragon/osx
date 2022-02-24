/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@superfluid-finance/ethereum-contracts/contracts/interfaces/tokens/ISETH.sol";
import "./IStreamPaymaster.sol";
import "./IWETH.sol";


/// @title todo
/// @author Michael Heuer - Aragon Association - 2022
/// @notice todo
contract SuperfluidPaymaster is IStreamPaymaster {
    ISETH wrappedNativeCoin;

    /// @dev Used for UUPS upgradability pattern
    function initialize(
        IDAO _dao,
        address _wrappedNativeCoin
    ) public {
        Paymaster.initialize(_dao);
        wrappedNativeCoin = ISETH(_wrappedNativeCoin);
    }

    function streamActive() override public view returns (bool){
        return streamBalance() > 0; // TODO
    }

    function streamBalance() override public view returns (uint256) {
        return IWETH(wrappedNativeCoin.getUnderlyingToken()).balanceOf(address(this));
    }

    function withdrawFromStream() public override {
        // convert native coin super token to native asset (ETH, MATIC, etc.)
        wrappedNativeCoin.downgradeToETH(streamBalance());
    }

}
