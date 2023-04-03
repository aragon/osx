---
title: How-to Guides
---

## Using the Aragon OSx Protocol

With a few lines of code, the Aragon OSx protocol allows you to add functionality to your DAO by writing and installing plugins

<details>
<summary>Example: A Plugin For Claiming Tokens</summary>

```solidity
contract TokenFaucet is Plugin {
    TestToken private immutable token;

    constructor(IDAO _dao, TestToken _token) Plugin(_dao) {
        token = _token
    }

    function claim() auth(MINT_PERMISSION_ID) external {
        token.mint({to: msg.sender, amount: 5});
    }
}
```

</details>

and effortlessly manage their permissions and conditions in your DAO

<details>
<summary>Example: Granting a Conditional Permission</summary>

```solidity
grantWithCondition({
    where: myTestToken,
    who: myTokenFaucetPlugin,
    permissionId: MINT_PERMISSION_ID,
    condition: myCondition
});
```

</details>

In this practice-focussed part of the documentation, we show you how to

- [Operate your DAO](./01-dao/index.md)
- [Develop your own Plugin](./02-plugin-development/index.md)

using the Aragon OSx protocol.
