import {expect} from 'chai';
import {ethers} from 'hardhat';

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
      const { user, contract, dao } = this.upgrade;
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

    it('updates well', async function () {
      const { user, contract, dao } = this.upgrade;
      await dao.grant(
        contract.address,
        user.address,
        upgradePermissionId
      );
      const connect = contract.connect(user);
      // @ts-ignore
      await connect.upgradeTo(uupsCompatibleBase);
      
      await dao.revoke(
        contract.address,
        user.address,
        upgradePermissionId
      );
    });
  });
}
