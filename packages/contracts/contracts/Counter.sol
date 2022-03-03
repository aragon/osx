pragma solidity 0.8.10;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";

contract Counter is BaseRelayRecipient {

	uint public counter;
	address public lastCaller;

	constructor(address _forwarder) public {
        _setTrustedForwarder(_forwarder);
	}

	function versionRecipient() external override view returns (string memory) {
		return "1.0.1";
	}

	function increment() public {
		counter++;
		lastCaller = _msgSender();
	}
} 