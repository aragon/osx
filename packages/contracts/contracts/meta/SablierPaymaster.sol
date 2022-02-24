/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./IStreamPaymaster.sol";
import "./ISablier.sol";
import "./IWETH.sol";

/// @title todo
/// @author Michael Heuer - Aragon Association - 2022
/// @notice todo
contract SablierPaymaster is IStreamPaymaster {
    ISablier sablier;
    uint256 streamId;
    IWETH wrappedNativeCoin; // wETH, wMatic

    event StreamChanged(uint256 streamId);

    error WrongRecipient(address expected, address actual);
    error WithdrawFailed();

    /// @dev Used for UUPS upgradability pattern
    function initialize(
        IDAO _dao,
        ISablier _sablier,
        uint256 _streamId
    ) public {
        Paymaster.initialize(_dao);
        sablier = _sablier;
        setStream(_streamId);
    }

    function streamActive() override public view returns (bool){
        (,,,,,,uint256 remainingBalance,) = sablier.getStream(streamId);

        return remainingBalance > 0;
    }

    function setStream(uint256 _streamId) public {
        (,address recipient,, address token,,,,) = sablier.getStream(_streamId);

        if(recipient != address(this))
            revert WrongRecipient({expected: address(this), actual: recipient});

        streamId = _streamId;
        wrappedNativeCoin = IWETH(token);

        emit StreamChanged(_streamId);
    }

    function streamBalance() override public view returns (uint256) {
        return sablier.balanceOf(streamId, address(this));
    }

    function withdrawFromStream() public override {
        uint256 wrappedNativeCoinBalance = streamBalance();
        sablier.withdrawFromStream(streamId, wrappedNativeCoinBalance);

        wrappedNativeCoin.withdraw(wrappedNativeCoinBalance); // unwrap to native coin
    }

}
