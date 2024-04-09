/* MARKDOWN
---
title: DAO Query [WIP]
sidebar_label: DAO Query
---

## DAO Query

The query 
*/
import {gql} from 'graphql-request';

export const QueryDao = gql`
  query Dao($address: ID!) {
    dao(id: $address) {
      id
      subdomain
      metadata
      createdAt
      plugins {
        appliedPreparation {
          pluginAddress
        }
        appliedPluginRepo {
          subdomain
        }
        appliedVersion {
          build
          release {
            release
          }
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
    "dao": {
      "id": "0x02bbc496bebc9a06c239670cea663c43cead899f",
      "subdomain": "test",
      "metadata": "ipfs://QmVGCibCLPgqA8eszxQJMzQFcmQAdrkyhTGH6EB5ERivsR",
      "createdAt": "1677584087",
      "plugins": [
        {
          "appliedPreparation": {
            "pluginAddress": "0x404f4bbd06e3a42c70297633e440b11bb083d482"
          },
          "appliedPluginRepo": {
            "subdomain": "multisig"
          },
          "appliedVersion": {
            "build": 1,
            "release": {
              "release": 1
            }
          }
        }
      ]
    }
  }
}
*/
