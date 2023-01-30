import {expect} from 'chai';
import {BytesLike} from 'ethers';
import {ethers} from 'hardhat';
import {InstallationPreparedEvent} from '../../../typechain/PluginSetupProcessor';

import {PermissionOperation} from './types';


// export async function assertInstallationPreparedEvent(
//   eventArgs: InstallationPreparedEvent['args'],
//   expectedArgs: InstallationPreparedEvent['args'],
// ) {
//   // Emitted setup id should match to the off-chain calculation.
//   expect(eventArgs.setupId).to.equal(setupId);

//   expect(eventArgs.plugin).to.not.equal(ethers.constants.AddressZero);
//   expect(helpers).to.deep.equal(eventArgs.preparedDependency.helpers);
//   expect(permissions).to.deep.equal(eventArgs.preparedDependency.permissions);
//   expect(data).to.equal(eventArgs.data);
//   expect(sender).to.equal(eventArgs.sender);
//   expect([1, 1]).to.deep.equal(eventArgs.versionTag);
//   expect(dao).to.equal(eventArgs.dao);
//   expect(pluginSetupRepo).to.equal(eventArgs.pluginSetupRepo);
// }
