import {expect} from 'chai';
import {ethers} from 'hardhat';

/// Used as a common test suite to test upgradeability of the contracts.
/// Presumes that `upgrade` object is set on `this` inside the actual test file.
/// this.upgrade consists of:
///     contract - address of the contract on which it tests if `upgradeTo` works as intended.
///     dao - dao contact that the contract belongs to.
///     user - ethers user object. Presumed that it doesn't have permission to call `upgradeTo`.
export function shouldUpgradeCorrectly(
  upgradePermissionId: string,
  upgradeRevertPermissionMessage: string
) {
  let uupsCompatibleBase: string;

  describe('UUPS Upgradeability Test', async () => {
    before(async () => {
      const factory = await ethers.getContractFactory(
        'PluginUUPSUpgradeableV1Mock'
      );
      uupsCompatibleBase = (await factory.deploy()).address;
    });

    it('reverts if user without permission tries to upgrade', async function () {
      const {user, contract, dao} = this.upgrade;
      const connect = contract.connect(user);
      const tx = connect.upgradeTo(ethers.constants.AddressZero);
      if (upgradeRevertPermissionMessage == 'DaoUnauthorized') {
        await expect(tx)
          .to.be.revertedWithCustomError(contract, 'DaoUnauthorized')
          .withArgs(
            dao.address,
            contract.address,
            contract.address,
            user.address,
            upgradePermissionId
          );
      } else {
        await expect(tx)
          .to.be.revertedWithCustomError(contract, 'Unauthorized')
          .withArgs(
            dao.address,
            contract.address,
            user.address,
            upgradePermissionId
          );
      }
    });

    it('updates correctly to new implementation', async function () {
      const {user, contract, dao} = this.upgrade;
      await dao.grant(contract.address, user.address, upgradePermissionId);
      const connect = contract.connect(user);
      await expect(connect.upgradeTo(uupsCompatibleBase))
        .to.emit(contract, 'Upgraded')
        .withArgs(uupsCompatibleBase);
    });
  });
}
