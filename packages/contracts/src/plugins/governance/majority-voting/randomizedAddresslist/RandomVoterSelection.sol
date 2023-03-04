// SPDX-License-Identifier: MIT
// An example of a consumer contract that directly pays for each request.
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/VRFV2WrapperConsumerBase.sol";

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
 */

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

contract RandomVoterSelection is
    VRFV2WrapperConsumerBase,
    ConfirmedOwner
{
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(
        uint256 requestId,
        uint256[] randomWords,
        uint256 payment
    );

    event RandomizedAddresses(
        address[] shuffledAddresses
    );

    event RandomizedAddress(address randomlyChosen);

    struct RequestStatus {
        uint256 paid; // amount paid in link
        bool fulfilled; // whether the request has been successfully fulfilled
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus)
        public s_requests; /* requestId --> requestStatus */

    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 callbackGasLimit = 100000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;

    // For this example, retrieve 2 random values in one request.
    // Cannot exceed VRFV2Wrapper.getConfig().maxNumWords.
    uint32 numWords = 1;

    // SEPOLIA Testnet
    address linkAddress = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address wrapperAddress = 0xab18414CD93297B0d12ac29E63Ca20f515b3DB46;

    // Note: Give permission to the plugin itself to change the address

    // GOERLI Testnet
    // address linkAddress = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB;
    // address wrapperAddress = 0x708701a1DfF4f478de54383E49a627eD4852C816;

    // Polygon - Mumbai Testnet
    // address linkAddress = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB;
    // address wrapperAddress = 0x99aFAf084eBA697E584501b8Ed2c0B37Dd136693;

    constructor()
        ConfirmedOwner(msg.sender)
        VRFV2WrapperConsumerBase(linkAddress, wrapperAddress)
    {}

    function requestRandomWords()
        external
        onlyOwner
        returns (uint256 requestId)
    {
        requestId = requestRandomness(
            callbackGasLimit,
            requestConfirmations,
            numWords
        );
        s_requests[requestId] = RequestStatus({
            paid: VRF_V2_WRAPPER.calculateRequestPrice(callbackGasLimit),
            randomWords: new uint256[](0),
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        emit RequestSent(requestId, numWords);
        return requestId;
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].paid > 0, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(
            _requestId,
            _randomWords,
            s_requests[_requestId].paid
        );
    }

    function getRequestStatus(
        uint256 _requestId
    )
        external
        view
        returns (uint256 paid, bool fulfilled, uint256[] memory randomWords)
    {
        require(s_requests[_requestId].paid > 0, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.paid, request.fulfilled, request.randomWords);
    }

    /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(linkAddress);
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

    /**
        Randomize the array based on the generated random seed
    */
    function randomizeArray(address[] memory array, uint256 seed) internal pure returns (address[] memory) {
        uint n = array.length;
        for (uint i = n - 1; i > 0; i--) {
            uint j = uint(keccak256(abi.encodePacked(seed, i))) % (i + 1);
            (array[i], array[j]) = (array[j], array[i]);
        }
        return array;
    }

    /**
        Now that we can properly access some random word number,
        utilize that to shuffle an array of Address types.
        Then we take the first n of those, and those are our chosen ones.
    */

    function shuffleAddresses(
        address[] memory _addresses,
        uint256 numberOfAddressesToReturn
    )
        external
        returns (address[] memory shuffledAddresses)
    {
        (uint256 paid, bool fulfilled, uint256[] memory randomWords) = this.getRequestStatus(lastRequestId);
        require(paid > 1, "shuffleAddresses: unpaid");
        require(fulfilled == true, "shuffleAddresses: randomness not yet fullfilled");
        uint256 randomWord = randomWords[0];
        require(_addresses.length > numberOfAddressesToReturn, "not enough addresses to shuffle");
        // Get the randomized version of this array
        _addresses = randomizeArray(_addresses, randomWord);
        // Now take a subarray and return that
        address[] memory returnAddresses = new address[](numberOfAddressesToReturn);
        for (uint i = 0; i < numberOfAddressesToReturn; i++) {
            returnAddresses[i] = _addresses[i];
            emit RandomizedAddress(returnAddresses[i]);
        }
        // emit RandomizedAddresses(returnAddresses); 
        // https://sepolia.etherscan.io/tx/0xdd37a013a1843d76f1be90c97e95657f86953d65ea395d4653fad2200d70ac90
        return returnAddresses;
    }
}