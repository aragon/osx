/* MARKDOWN
---
title: Balances Query [WIP]
sidebar_label: Balances Query
---

## Balances Query

The query
*/
import {gql} from 'graphql-request';

export const QueryTokenBalances = gql`
  query TokenBalances(
    $where: TokenBalance_filter!
    $limit: Int!
    $skip: Int!
    $direction: OrderDirection!
    $sortBy: TokenBalance_orderBy!
  ) {
    tokenBalances(
      where: $where
      first: $limit
      skip: $skip
      orderDirection: $direction
      orderBy: $sortBy
    ) {
      lastUpdated
      __typename
      ... on ERC20Balance {
        balance
        token {
          name
          decimals
          symbol
          id
        }
      }
      ... on ERC721Balance {
        token {
          name
          symbol
          id
        }
        tokenIds
      }
      ... on NativeBalance {
        balance
      }
      ... on ERC1155Balance {
        metadataUri
        token {
          id
        }
        balances {
          amount
          id
          tokenId
        }
      }
    }
  }
`;

/* MARKDOWN
The return

```json
{
  "data": {
    "tokenBalances": [
      {
        "lastUpdated": "1682856167",
        "__typename": "ERC20Balance",
        "balance": "308999000000000004456448",
        "token": {
          "name": "VEGAHVB",
          "decimals": 18,
          "symbol": "VGH",
          "id": "0x63677b9f25431e361f15019637533b4228cdc3ef"
        }
      },
      {
        "lastUpdated": "1682856587",
        "__typename": "ERC20Balance",
        "balance": "499999999999999991611392",
        "token": {
          "name": "42K",
          "decimals": 18,
          "symbol": "42K",
          "id": "0x7604fb940b31c988405847cc2db7a90938b529fc"
        }
      },
      {
        "lastUpdated": "1697108195",
        "__typename": "NativeBalance",
        "balance": "2010000000000000"
      }
    ]
  }
}
*/
