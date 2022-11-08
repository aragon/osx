import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO} from '../../typechain';
import {findEvent, DAO_EVENTS, VOTING_EVENTS} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {VoteOption, pct16} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('AllowlistVoting', function () {
  let signers: SignerWithAddress[];
  let voting: any;
  let dao: DAO;
  let ownerAddress: string;
  let user1: string;
  let dummyActions: any;
  let dummyMetadata: string;

  let mergedAbi: any;
  let allowlistVotingFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    user1 = await signers[1].getAddress();

    ({abi: mergedAbi, bytecode: allowlistVotingFactoryBytecode} =
      await getMergedABI(
        // @ts-ignore
        hre,
        'AllowlistVoting',
        ['DAO']
      ));

    dummyActions = [
      {
        to: ownerAddress,
        data: '0x00000000',
        value: 0,
      },
    ];
    dummyMetadata = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes('0x123456789')
    );

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    const AllowlistVotingFactory = new ethers.ContractFactory(
      mergedAbi,
      allowlistVotingFactoryBytecode,
      signers[0]
    );
    voting = await AllowlistVotingFactory.deploy();

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
    dao.grant(
      voting.address,
      ownerAddress,
      ethers.utils.id('MODIFY_ALLOWLIST_PERMISSION')
    );
  });

  function initializeVoting(
    participationRequired: any,
    relativeSupportThresholdPct: any,
    minDuration: any,
    allowed: Array<string>
  ) {
    return voting.initialize(
      dao.address,
      participationRequired,
      relativeSupportThresholdPct,
      minDuration,
      allowed
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeVoting(1, 2, 3, []);

      await expect(initializeVoting(1, 2, 3, [])).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });
  });

  describe('WhitelistingUsers: ', async () => {
    beforeEach(async () => {
      await initializeVoting(1, 2, 3, []);
    });
    it('should return false, if user is not allowed', async () => {
      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isAllowed(ownerAddress, block1.number)).to.equal(
        false
      );
    });

    it('should add new users in the whitelist', async () => {
      await voting.addAllowedUsers([ownerAddress, user1]);

      const block = await ethers.provider.getBlock('latest');

      await ethers.provider.send('evm_mine', []);

      expect(await voting.isAllowed(ownerAddress, block.number)).to.equal(true);
      expect(await voting.isAllowed(ownerAddress, 0)).to.equal(true);
      expect(await voting.isAllowed(user1, 0)).to.equal(true);
    });

    it('should remove users from the whitelist', async () => {
      await voting.addAllowedUsers([ownerAddress]);

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isAllowed(ownerAddress, block1.number)).to.equal(
        true
      );
      expect(await voting.isAllowed(ownerAddress, 0)).to.equal(true);

      await voting.removeAllowedUsers([ownerAddress]);

      const block2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isAllowed(ownerAddress, block2.number)).to.equal(
        false
      );
      expect(await voting.isAllowed(ownerAddress, 0)).to.equal(false);
    });
  });

  describe('StartVote', async () => {
    let minDuration = 3;

    beforeEach(async () => {
      await initializeVoting(1, 2, 3, [ownerAddress]);
    });

    it('reverts if user is not allowed to create a vote', async () => {
      await expect(
        voting
          .connect(signers[1])
          .createVote(dummyMetadata, [], 0, 0, false, VoteOption.None)
      ).to.be.revertedWith(
        customError('VoteCreationForbidden', signers[1].address)
      );
    });

    it('reverts if vote duration is less than minDuration', async () => {
      const block = await ethers.provider.getBlock('latest');
      const current = block.timestamp;
      const startDate = block.timestamp;
      const endDate = startDate + (minDuration - 1);
      await expect(
        voting.createVote(
          dummyMetadata,
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError(
          'VoteTimesInvalid',
          current + 1, // TODO hacky
          startDate,
          endDate,
          minDuration
        )
      );
    });

    it('should create a vote successfully, but not vote', async () => {
      const id = 0; // voteId

      expect(
        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        )
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(id, ownerAddress, dummyMetadata);

      const block = await ethers.provider.getBlock('latest');

      const vote = await voting.getVote(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote._relativeSupportThresholdPct).to.equal(2);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote._totalSupportThresholdPct).to.equal(1);
      expect(vote.yes).to.equal(0);
      expect(vote.no).to.equal(0);

      expect(vote.startDate.add(minDuration)).to.equal(vote.endDate);

      expect(await voting.canVote(id, ownerAddress)).to.equal(true);
      expect(await voting.canVote(id, user1)).to.equal(false);
      expect(await voting.canVote(1, ownerAddress)).to.equal(false);

      expect(vote.actions.length).to.equal(1);
      expect(vote.actions[0].to).to.equal(dummyActions[0].to);
      expect(vote.actions[0].value).to.equal(dummyActions[0].value);
      expect(vote.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a vote and cast a vote immediately', async () => {
      const id = 0; // voteId

      expect(
        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.Yes
        )
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(id, ownerAddress, dummyMetadata)
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      const block = await ethers.provider.getBlock('latest');
      const vote = await voting.getVote(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote._relativeSupportThresholdPct).to.equal(2);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote._totalSupportThresholdPct).to.equal(1);

      expect(vote.yes).to.equal(1);
      expect(vote.no).to.equal(0);
    });
  });

  describe('Vote + Execute:', async () => {
    let minDuration = 500;
    let relativeSupportThresholdPct = pct16(29);
    let totalSupportThresholdPct = pct16(19);
    const id = 0; // voteId

    beforeEach(async () => {
      const addresses = [];

      for (let i = 0; i < 10; i++) {
        const addr = await signers[i].getAddress();
        addresses.push(addr);
      }

      // voting will be initialized with 10 allowed addresses
      // Which means plenum = 10 at this point.
      await initializeVoting(
        totalSupportThresholdPct,
        relativeSupportThresholdPct,
        minDuration,
        addresses
      );

      await voting.createVote(
        dummyMetadata,
        dummyActions,
        0,
        0,
        false,
        VoteOption.None
      );
    });

    // VoteOption.Yes
    it('increases the yes or no count and emit correct events', async () => {
      expect(await voting.vote(id, VoteOption.Yes, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      let vote = await voting.getVote(id);
      expect(vote.yes).to.equal(1);

      expect(await voting.vote(id, VoteOption.No, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.No, 1);

      vote = await voting.getVote(id);
      expect(vote.no).to.equal(1);

      expect(await voting.vote(id, VoteOption.Abstain, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Abstain, 1);

      vote = await voting.getVote(id);
      expect(vote.abstain).to.equal(1);
    });

    it('should not double-count votes by the same address', async () => {
      // yes still ends up to be 1 here even after voting
      // 2 times from the same wallet.
      await voting.vote(id, VoteOption.Yes, false);
      await voting.vote(id, VoteOption.Yes, false);
      expect((await voting.getVote(id)).yes).to.equal(1);

      // yes gets removed, no ends up as 1.
      await voting.vote(id, VoteOption.No, false);
      await voting.vote(id, VoteOption.No, false);
      expect((await voting.getVote(id)).no).to.equal(1);

      await voting.vote(id, VoteOption.Abstain, false);
      await voting.vote(id, VoteOption.Abstain, false);
      expect((await voting.getVote(id)).abstain).to.equal(1);
    });

    it('becomes executable if enough yes is given from voting power', async () => {
      // Since voting power is set to 29%, and
      // allowlist is 10 addresses, voting yes
      // from 3 addresses should be enough to
      // make vote executable
      await voting.vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      // // only 2 voted, not enough for 30%
      expect(await voting.canExecute(id)).to.equal(false);
      // // 3rd votes, enough.
      await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);

      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('becomes executable if enough yes is given depending on yes + no total', async () => {
      // 2 supports
      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      // 2 not supports
      await voting.connect(signers[2]).vote(id, VoteOption.No, false);
      await voting.connect(signers[3]).vote(id, VoteOption.No, false);

      // 2 abstain
      await voting.connect(signers[4]).vote(id, VoteOption.Abstain, false);
      await voting.connect(signers[5]).vote(id, VoteOption.Abstain, false);

      expect(await voting.canExecute(id)).to.equal(false);

      // closes the vote.
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      // 2 voted yes, 2 voted no. 2 voted abstain.
      // Enough to surpass supportedRequired percentage
      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('executes the vote immediately while final yes is given', async () => {
      // 2 votes in favor of yes
      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      // 3th supports(which is enough) and should execute right away.
      let tx = await voting.connect(signers[3]).vote(id, VoteOption.Yes, true);
      let rc = await tx.wait();

      // check for the `Executed` event in the DAO
      {
        const event = await findEvent(tx, DAO_EVENTS.EXECUTED);

        expect(event.args.actor).to.equal(voting.address);
        expect(event.args.callId).to.equal(id);
        expect(event.args.actions.length).to.equal(1);
        expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
        expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
        expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
        expect(event.args.execResults).to.deep.equal(['0x']);

        const vote = await voting.getVote(id);

        expect(vote.executed).to.equal(true);
      }

      // check for the `VoteExecuted` event in the voting contract
      {
        const event = await findEvent(tx, VOTING_EVENTS.VOTE_EXECUTED);
        expect(event.args.voteId).to.equal(id);
        expect(event.args.execResults).to.deep.equal(['0x']);
      }

      // calling execute again should fail
      await expect(voting.execute(id)).to.be.revertedWith(
        customError('VoteExecutionForbidden', id)
      );
    });

    it('reverts if vote is executed while enough yes is not given ', async () => {
      await expect(voting.execute(id)).to.be.revertedWith(
        customError('VoteExecutionForbidden', id)
      );
    });
  });

  describe('Parameters can satisfy different use cases:', async () => {
    const id = 0; // voteId

    describe('A simple majority vote with >50% relative support and >25% total support required', async () => {
      let minDuration = 500;
      let relativeSupportThresholdPct = pct16(50);
      let totalSupportThresholdPct = pct16(25);

      beforeEach(async () => {
        const addresses = [];

        for (let i = 0; i < 10; i++) {
          const addr = await signers[i].getAddress();
          addresses.push(addr);
        }

        // voting will be initialized with 10 allowed addresses
        // Which means plenum = 10 at this point.
        await initializeVoting(
          totalSupportThresholdPct,
          relativeSupportThresholdPct,
          minDuration,
          addresses
        );

        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        );
      });

      it('does not execute if support is high enough but participation and approval (absolute support) are too low', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 10% | 100%
        //  𐄂  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // Reason: approval and participation are too low

        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // dur | tot | rel
        // 510 | 10% | 100%
        //  ✓  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // vote end does not help
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);
        // dur | tot | rel
        //  0  | 30% | 33%
        //  𐄂  |  ✓  |  𐄂
        expect(await voting.canExecute(id)).to.equal(false); // approval too low, duration and support criterium are not met

        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // dur | tot | rel
        // 510 | 30% | 33%
        //  ✓  |  ✓  |  𐄂
        expect(await voting.canExecute(id)).to.equal(false); // vote end does not help
      });

      it('executes after the duration if total and relative support criteria are met', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 30% | 100%
        //  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // Reason: duration criterium is not met

        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // dur | tot | rel
        // 510 | 30% | 100%
        //  ✓  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true); // all criteria are met
      });

      it('executes early if the approval (absolute support) exceeds the required support (assuming the latter is > 50%)', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 50% | 100%
        //  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // Reason: app > supReq == false

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 60% | 100%
        //  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true); // Correct because more voting doesn't change the outcome

        await voting.connect(signers[6]).vote(id, VoteOption.No, false);
        await voting.connect(signers[7]).vote(id, VoteOption.No, false);
        await voting.connect(signers[8]).vote(id, VoteOption.No, false);
        await voting.connect(signers[9]).vote(id, VoteOption.No, false);
        // dur | tot | rel
        //  0  | 60% | 60%
        //  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true); // The outcome did not change
      });
    });

    describe('A 3/5 multi-sig', async () => {
      let minDuration = 500;

      // pay attention to decrement the required percentage value by one because the compared value has to be larger
      let relativeSupportThresholdPct = pct16(60).sub(ethers.BigNumber.from(1));
      let totalSupportThresholdPct = relativeSupportThresholdPct;

      beforeEach(async () => {
        const addresses = [];

        for (let i = 0; i < 5; i++) {
          const addr = await signers[i].getAddress();
          addresses.push(addr);
        }

        // voting will be initialized with 5 allowed addresses
        // Which means plenum = 5 at this point.
        await initializeVoting(
          totalSupportThresholdPct,
          relativeSupportThresholdPct,
          minDuration,
          addresses
        );

        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        );
      });

      it('early execution is possible', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 20% | 100%
        //  𐄂  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 40% | 100%
        //  𐄂  |  𐄂  |  𐄂
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 60% | 100%
        //  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('should not execute with only 2 yes votes', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);
        // dur | tot | rel
        //  0  | 40% | 67%
        //  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(false);

        // Wait until the voting period is over.
        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // dur | tot | rel
        // 510 | 40% | 67%
        //  ✓  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(false);
      });
    });
  });
});
