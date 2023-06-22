---
title: Best Practices
---

## Some Advice When Operating your DAO

### DOs 👌

- Make sure that at least one address (typically a governance plugin) has `EXECUTE_PERMISSION_ID` permission so that something can be executed on behalf of the DAO.
- Check every proposal asking to install, update, or uninstall a plugin with utmost care and review. Installation means granting an external contract permissions to do things on behalf of your DAO, so you want to be extra careful about:
  - the implementation contract
  - the setup contract
  - the helper contracts
  - the permissions being granted/revoked

### DON'Ts ✋

- Incapacitate your DAO by revoking all `EXECUTE_PERMISSION`. This means your DAO will be blocked and any assets you hold may be locked in forever. This can happen through:
  - uninstalling your last governance plugin.
  - applying an update to your last governance plugin.
- Don't give permissions to directly call functions from the DAO. Better and safer to use a plugin instead.
- If you're using the Token Voting plugin in your DAO, make sure you don't mint additional tokens without careful consideration. If you mint too many at once, this may lock your DAO, since you will not be able to reach the minimum participation threshold. This happens if there are not enough tokens already on the market to meet the minimum participation percentage and the DAO owns most of the governance tokens.
