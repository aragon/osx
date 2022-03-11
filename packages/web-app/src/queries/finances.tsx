import {gql} from '@apollo/client';

/**
 * Voters and Actions can be paginanted
 * or can be used to get array length
 */
export const DAO_BALANCE_LIST = gql`
  query balances($dao: ID, $offset: Int, $limit: Int) {
    balances(
      where: {dao: $dao}
      skip: $offset
      first: $limit
      orderBy: lastUpdated
      orderDirection: desc
    ) {
      id
      token {
        id
        name
        symbol
        decimals
      }
      dao {
        id
      }
      balance
      lastUpdated
    }
  }
`;

export const DAO_TRANSFER_LIST = gql`
  query transfers($dao: ID, $offset: Int, $limit: Int) {
    vaultDeposits(
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
      token {
        id
        name
        symbol
        decimals
      }
      sender
      amount
      reference
      transaction
      createdAt
    }
    vaultWithdraws(
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
      token {
        id
        name
        symbol
        decimals
      }
      to
      amount
      reference
      transaction
      proposal {
        id
      }
      createdAt
    }
  }
`;
