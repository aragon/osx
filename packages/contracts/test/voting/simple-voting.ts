import chai, { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { defaultAbiCoder, BytesLike } from 'ethers/lib/utils';
import chaiUtils from '../test-utils';

chai.use(chaiUtils);

import { SimpleVoting } from '../../typechain';
import ERC20Governance from '../../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';

const { deployMockContract } = waffle;

const ERRORS = {
    ERROR_INIT_PCTS: "VOTING_INIT_PCTS",
    ERROR_INIT_SUPPORT_TOO_BIG: "VOTING_INIT_SUPPORT_TOO_BIG",
    ERROR_NO_VOTING_POWER: "VOTING_NO_VOTING_POWER",
    ERROR_CAN_NOT_VOTE: "VOTING_CAN_NOT_VOTE",
    ERROR_CHANGE_SUPPORT_PCTS: "VOTING_CHANGE_SUPPORT_PCTS",
    ERROR_CHANGE_SUPPORT_TOO_BIG: "VOTING_CHANGE_SUPP_TOO_BIG",
    ERROR_CAN_NOT_EXECUTE: "VOTING_CAN_NOT_EXECUTE",
    ERROR_EXECUTION_STATE_WRONG: "ERROR_EXECUTION_STATE_WRONG",
    NOT_ALLOWED_ACTION: 'Not allowed action passed!',
    ALREADY_INITIALIZED: 'Initializable: contract is already initialized'
};

const toBn = ethers.BigNumber.from;
const bigExp = (x:number, y:number) => toBn(x).mul(toBn(10).pow(toBn(y)));
const pct16 = (x: number) => bigExp(x, 16);

const EVENTS = {
  REGISTERED_CALLBACK: 'RegisteredCallback',
  REGISTERED_STANDARD: 'RegisteredStandard',
  RECEIVED_CALLBACK: 'ReceivedCallback',
  CHANGE_CONFIG: 'ChangeConfig',
  START_VOTE: 'StartVote',
  CAST_VOTE: 'CastVote',
  EXECUTED: 'Executed'
};

function createProposal(
    {actions, metadata, description, castVote, executeIfDecided}: 
    {actions?: any, metadata?: string, description?: string, castVote?: boolean, executeIfDecided?: boolean}
) {
    const proposal = {
        actions : actions || [],
        metadata: metadata || '0x',
        additionalArguments: defaultAbiCoder.encode([
            'string',
            'bool',
            'bool'
        ],[
            description || '0x',
            executeIfDecided || false,
            castVote || false,
        ])
    };

    return proposal;
}

function createVoteData(supports: boolean, executeIfDecided: boolean) {
    return defaultAbiCoder.encode([
        'bool',
        'bool'
    ],[
        supports,
        executeIfDecided
    ]);
}

describe('Voting: SimpleVoting', function () {
    let signers: any;
    let voting: SimpleVoting;
    let daoMock: any;
    let erc20VoteMock: any;
    let ownerAddress: string;
    let dummyActions: any;

    before(async () => {
        signers = await ethers.getSigners();
        ownerAddress = await signers[0].getAddress();

        dummyActions = [{
            to: ownerAddress,
            data: '0x00000000',
            value: 0
        }];
        
        const DAOMock = await ethers.getContractFactory('DAOMock');
        daoMock = await DAOMock.deploy(ownerAddress);
    })

    beforeEach(async () => {
        erc20VoteMock = await deployMockContract(signers[0], ERC20Governance.abi);
        
        const SimpleVoting = await ethers.getContractFactory('SimpleVoting');
        voting = await SimpleVoting.deploy();
    })

    function initializeVoting(voteSettings: any, allowedActions: BytesLike[]) {
        return voting['initialize(address,address,uint64[3],bytes[])']
            (
                daoMock.address, 
                erc20VoteMock.address, 
                voteSettings, 
                allowedActions
            );
    }

    describe("initialize: ", async () => {
        it("reverts if quorom is less than support required", async () => {
            await expect(
                initializeVoting([2, 1,3],[])
            ).to.be.revertedWith(ERRORS.ERROR_INIT_PCTS);
        })
        it("reverts if trying to re-initialize", async () => {
            await initializeVoting([1, 2, 3],[]);

            await expect(
                initializeVoting([2, 1,3],[])
            ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
        })
        it("should initialize dao on the component", async () => {
            // TODO: Waffle's calledOnContractWith is not supported by Hardhat
            // await voting['initialize(address,address,uint64[3],bytes[])']
            //          (daoMock.address, erc20VoteMock.address, [1, 2, 3], [])
            
            // expect('initialize').to.be.calledOnContractWith(voting, [daoMock.address]);
        })
    })

    describe("changeConfig: ", async () => {
        beforeEach(async () => {
            await initializeVoting([1, 2, 3], []);
        });
        it("reverts if wrong config is set", async () => {
            await expect(
                voting.changeVoteConfig(1, 2)
            ).to.be.revertedWith(ERRORS.ERROR_CHANGE_SUPPORT_PCTS);

            await expect(
                voting.changeVoteConfig(pct16(1000), 1)
            ).to.be.revertedWith(ERRORS.ERROR_CHANGE_SUPPORT_TOO_BIG);
        })

        it("should change config successfully", async () => {
            expect(await voting.changeVoteConfig(20, 10))
                .to.emit(voting, EVENTS.CHANGE_CONFIG)
                .withArgs(20, 10);
        })
    })

    describe("StartVote", async () => {
        beforeEach(async () => {
            await initializeVoting([1, 2, 3], []);
        })

        it("reverts if allowed action is not passed through proposal", async () => {
            const proposal = createProposal({ actions: dummyActions });
            await expect(
                voting.start(proposal)
            ).to.be.revertedWith(ERRORS.NOT_ALLOWED_ACTION);
        })

        it("reverts total token supply while creating a vote is 0", async () => {
            const proposal = createProposal({});
            await erc20VoteMock.mock.getPastTotalSupply.returns(0);
            await expect(
                voting.start(proposal)
            ).to.be.revertedWith(ERRORS.ERROR_NO_VOTING_POWER);
        })

        it("should create a vote successfully, but not vote", async () => {
            const proposal = createProposal({ 
                actions: dummyActions, 
                description: 'vote!'
            });

            let allowedActions = [ownerAddress + '00000000'];

            await voting.addAllowedActions(allowedActions);
            
            await erc20VoteMock.mock.getPastTotalSupply.returns(1);
            await erc20VoteMock.mock.getPastVotes.returns(0);

            expect(await voting.start(proposal))
                .to.emit(voting, EVENTS.START_VOTE)
                .withArgs(1, ownerAddress, "vote!");

            const vote = await voting.getVote(1);
            expect(vote.open).to.equal(true);
            expect(vote.executed).to.equal(false);
            expect(vote.supportRequired).to.equal(2);
            expect(vote.minAcceptQuorum).to.equal(1);
            expect(vote.votingPower).to.equal(1);
            expect(vote.yea).to.equal(0);
            expect(vote.nay).to.equal(0);

            expect(await voting.canVote(1, ownerAddress)).to.equal(false);

            expect(vote.actions).to.eql([
                [
                    dummyActions[0].to,
                    ethers.BigNumber.from(dummyActions[0].value),
                    dummyActions[0].data,
                ]
            ]);
        })

        it("should create a vote and cast a vote immediatelly", async () => {
            const proposal = createProposal({
                actions: dummyActions,
                description: 'vote!',
                castVote: true
            });

            let allowedActions = [ownerAddress + '00000000'];

            await voting.addAllowedActions(allowedActions);
            
            await erc20VoteMock.mock.getPastTotalSupply.returns(1);
            await erc20VoteMock.mock.getPastVotes.returns(1);

            expect(await voting.start(proposal))
                .to.emit(voting, EVENTS.START_VOTE)
                .withArgs(1, ownerAddress, "vote!")
                .to.emit(voting, EVENTS.CAST_VOTE)
                .withArgs(1, ownerAddress, true, 1);

            const vote = await voting.getVote(1);
            expect(vote.open).to.equal(true);
            expect(vote.executed).to.equal(false);
            expect(vote.supportRequired).to.equal(2);
            expect(vote.minAcceptQuorum).to.equal(1);
            expect(vote.votingPower).to.equal(1);
            expect(vote.yea).to.equal(1);
            expect(vote.nay).to.equal(0);
        })
    })

    describe("Vote + Execute:", async () => {
        let voteTime = 500;
        let supportRequired = pct16(50);
        let minimumQuorom = pct16(20);
        let votingPower = 100;

        beforeEach(async () => {
            await initializeVoting([minimumQuorom, supportRequired, voteTime], []);

            // set voting power to 100
            await erc20VoteMock.mock.getPastTotalSupply.returns(votingPower);
            
            const proposal = createProposal({ actions: dummyActions });
            let allowedActions = [ownerAddress + '00000000'];

            await voting.addAllowedActions(allowedActions);
            await voting.start(proposal);
        })

        it("should not be able to vote if user has 0 token", async () => {
            await erc20VoteMock.mock.getPastVotes.returns(0);

            await expect(
                voting.vote(1, createVoteData(true, false))
            ).to.be.revertedWith(ERRORS.ERROR_CAN_NOT_VOTE);
        })

        it("increases the yea or nay count and emit correct events", async () => {
            await erc20VoteMock.mock.getPastVotes.returns(1);

            const data1 = createVoteData(true, false);
            expect(await voting.vote(1, data1))
                .to.emit(voting, EVENTS.CAST_VOTE)
                .withArgs(1, ownerAddress, true, 1);

            let vote = await voting.getVote(1);
            expect(vote.yea).to.equal(1);

            const data2 = createVoteData(false, false);
            expect(await voting.vote(1, data2))
                .to.emit(voting, EVENTS.CAST_VOTE)
                .withArgs(1, ownerAddress, false, 1);

            vote = await voting.getVote(1);
            expect(vote.nay).to.equal(1);
        })

        it("voting multiple times should not increase yea or nay multiple times", async () => {
            await erc20VoteMock.mock.getPastVotes.returns(1);

            // yea still ends up to be 1 here even after voting
            // 2 times from the same wallet.
            const data1 = createVoteData(true, false);
            await voting.vote(1, data1);
            await voting.vote(1, data1);

            // yea gets removed, nay ends up as 1.
            const data2 = createVoteData(false, false);
            await voting.vote(1, data2);
            await voting.vote(1, data2);

            const vote = await voting.getVote(1);

            expect(vote.yea).to.equal(0);
            expect(vote.nay).to.equal(1);
        })

        it("makes executable if enough yea is given from voting power", async () => {
            // vote with yea as 50 voting stake, which is still 
            // not enough to make vote executable as support required percentage
            // is set to supportRequired = 51. 
            await erc20VoteMock.mock.getPastVotes.returns(50);

            const data = createVoteData(true, false);
            await voting.vote(1, data);
            expect(await voting.canExecute(1)).to.equal(false);

            // vote with yea as 1 voting stake from another wallet, 
            // which becomes 51 total and enough
            await erc20VoteMock.mock.getPastVotes.returns(1);
            await voting.connect(signers[1]).vote(1, data);

            expect(await voting.canExecute(1)).to.equal(true);
        })
        
        it("returns executable if enough yea is given depending on yea + nay total", async () => {
            // vote with yea as 50 voting stake, which is still enough 
            // to make vote executable even if the vote is closed due to 
            // its duration length.
            await erc20VoteMock.mock.getPastVotes.returns(50);
            // supports
            await voting.vote(1, createVoteData(true, false));

            // vote with nay with 30 voting stake.
            await erc20VoteMock.mock.getPastVotes.returns(30);
            // not supports
            await voting.connect(signers[1]).vote(1, createVoteData(false, false));
            
            // makes the voting closed.
            await ethers.provider.send('evm_increaseTime', [voteTime + 10]);
            await ethers.provider.send('evm_mine', []);

            expect(await voting.canExecute(1)).to.equal(true);
        })

        it("makes NON-executable if enough yea isn't given depending on yea + nay total", async () => {
            // vote with yea as 20 voting stake, which is still not enough 
            //to make vote executable while vote is open or even after it's closed.
            await erc20VoteMock.mock.getPastVotes.returns(20);
            // supports
            await voting.vote(1, createVoteData(true, false));

            // vote with nay with 30 voting stake.
            await erc20VoteMock.mock.getPastVotes.returns(30);
            // not supports
            await voting.connect(signers[1]).vote(1, createVoteData(false, false));
            
            // makes the voting closed.
            await ethers.provider.send('evm_increaseTime', [voteTime + 10]);
            await ethers.provider.send('evm_mine', []);

            expect(await voting.canExecute(1)).to.equal(false);
        })  

        it("executes the vote immediatelly while final yea is given", async () => {
            // vote with supportRequired staking, so 
            // it immediatelly executes the vote
            await erc20VoteMock.mock.getPastVotes.returns(51);

            // supports and should execute right away.
            expect(await voting.vote(1, createVoteData(true, true)))
                .to.emit(daoMock, EVENTS.EXECUTED)
                .withArgs(
                    voting.address, 
                    [
                        [
                          dummyActions[0].to,
                          ethers.BigNumber.from(dummyActions[0].value),
                          dummyActions[0].data,
                        ],
                    ],
                    []
                );

            const vote = await voting.getVote(1);

            expect(vote.executed).to.equal(true);

            // calling execute again should fail
            await expect(
                voting.execute(1)
            ).to.be.revertedWith(ERRORS.ERROR_EXECUTION_STATE_WRONG);
        })

        it("reverts if vote is executed while enough yea is not given ", async () => {
            await expect(
                voting.execute(1)
            ).to.be.revertedWith(ERRORS.ERROR_CAN_NOT_EXECUTE);
        })
    })
})
