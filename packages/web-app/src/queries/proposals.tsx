import {gql} from '@apollo/client';

/**
 * Voters and Actions can be paginanted
 * or can be used to get array length
 */
export const WHITELIST_PROPOSAL_LIST = gql`
  query whitelistProposals($dao: ID, $offset: Int, $limit: Int) {
    whitelistProposals(
      where: {dao: $dao}
      skip: $offset
      first: $limit
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      dao {
        id
      }
      actions {
        id
        to
        value
        data
        execResult
      }
      pkg {
        id
        supportRequiredPct
        participationRequiredPct
        minDuration
        votesLength
        users {
          id
        }
      }
      voteId
      creator
      description
      startDate
      endDate
      supportRequiredPct
      participationRequired
      votingPower
      yea
      nay
      abstain
      voters {
        id
        vote
        createdAt
      }
      executed
      createdAt
    }
  }
`;

/**
 * Voters and Actions can be paginanted
 * or can be used to get array length
 */
export const WHITELIST_PROPOSAL_DETAILS = gql`
  query whitelistProposals($id: ID) {
    whitelistProposals(where: {id: $id}) {
      id
      dao {
        id
      }
      actions {
        id
        to
        value
        data
        execResult
      }
      pkg {
        id
        supportRequiredPct
        participationRequiredPct
        minDuration
        votesLength
        users {
          id
        }
      }
      voteId
      creator
      description
      startDate
      endDate
      supportRequiredPct
      participationRequired
      votingPower
      yea
      nay
      abstain
      voters {
        id
        vote
        createdAt
      }
      executed
      createdAt
    }
  }
`;

/**
 * Voters and Actions can be paginanted
 * or can be used to get array length (in case of erc20Voting Voters does not mean it covers all the voters of this package)
 */
export const ERC20VOTING_PROPOSAL_LIST = gql`
  query erc20VotingProposals($dao: ID, $offset: Int, $limit: Int) {
    erc20VotingProposals(
      where: {dao: $dao}
      skip: $offset
      first: $limit
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      actions {
        id
        to
        value
        data
        execResult
      }
      pkg {
        id
        supportRequiredPct
        participationRequiredPct
        minDuration
        votesLength
        token {
          id
          name
          symbol
          decimals
        }
      }
      voteId
      creator
      description
      startDate
      endDate
      snapshotBlock
      supportRequiredPct
      participationRequiredPct
      yea
      nay
      abstain
      votingPower
      voters {
        id
      }
      executed
      createdAt
    }
  }
`;

/**
 * Voters and Actions can be paginanted
 * or can be used to get array length (in case of erc20Voting Voters does not mean it covers all the voters of this package)
 */
export const ERC20VOTING_PROPOSAL_DETAILS = gql`
  query erc20VotingProposal($id: ID) {
    erc20VotingProposals(where: {id: $id}) {
      id
      actions {
        id
        to
        value
        data
        execResult
      }
      pkg {
        id
        supportRequiredPct
        participationRequiredPct
        minDuration
        votesLength
        token {
          id
          name
          symbol
          decimals
        }
      }
      voteId
      creator
      description
      startDate
      endDate
      snapshotBlock
      supportRequiredPct
      participationRequiredPct
      yea
      nay
      abstain
      votingPower
      voters {
        id
        vote
        stake
      }
      executed
      createdAt
    }
  }
`;
