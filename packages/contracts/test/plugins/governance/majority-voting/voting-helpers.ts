import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {BigNumber, Contract} from 'ethers';

export enum VoteOption {
  None,
  Abstain,
  Yes,
  No,
}

export enum VotingMode {
  Standard,
  EarlyExecution,
  VoteReplacement,
}

export type VotingSettings = {
  votingMode: number;
  supportThreshold: BigNumber;
  minParticipation: BigNumber;
  minDuration: number;
  minProposerVotingPower: number;
};

export async function voteWithSigners(
  votingContract: Contract,
  proposalId: number,
  signers: SignerWithAddress[],
  signerIds: {
    yes: number[];
    no: number[];
    abstain: number[];
  }
) {
  let promises = signerIds.yes.map(i =>
    votingContract.connect(signers[i]).vote(proposalId, VoteOption.Yes, false)
  );

  promises = promises.concat(
    signerIds.no.map(i =>
      votingContract.connect(signers[i]).vote(proposalId, VoteOption.No, false)
    )
  );
  promises = promises.concat(
    signerIds.abstain.map(i =>
      votingContract
        .connect(signers[i])
        .vote(proposalId, VoteOption.Abstain, false)
    )
  );

  await Promise.all(promises);
}
