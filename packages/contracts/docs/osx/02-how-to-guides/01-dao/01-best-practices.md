---
title: Best Practices
---

## Some Advice When Operating your DAO

### DOs 👌

- Make sure that at least one address (typically a governance plugin) has `EXECUTE_PERMISSION_ID` permission so that something can always execute on behalf of the DAO.
- Check every proposal asking to install, update, or uninstall a plugin with utmost care and review. Installation means granting an external contract permissions, so you want to be extra careful about:
  - the implementation contract
  - the setup contract
  - the helper contracts
  - the permissions

### DON'Ts ✋

- Incapacitate your DAO by revoking the last `EXECUTE_PERMISSION_ID`. This means your DAO will be blocked and any assets you hold may be locked in forever. Revoking `EXECUTION_PERMISSION_ID` is done through:
  - uninstalling your last governance plugin.
  - applying an update to your last governance plugin.
- You shouldn't create a DAO with no plugins, or with plugins that can’t effectively execute. This will block your DAO from ever being used, since you need some kind of governance mechanism to execute actions.
- Don't give permissions to directly call functions from the DAO. Better and safer to use a plugin instead.
