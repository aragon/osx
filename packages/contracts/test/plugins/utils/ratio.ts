import {expect} from 'chai';
import {ethers} from 'hardhat';

import {RatioTest} from '../../../typechain';
import {pctToRatio, RATIO_BASE} from '../../test-utils/voting';

describe('Ratio', function () {
  let ratio: RatioTest;

  before(async () => {
    const RatioTest = await ethers.getContractFactory('RatioTest');
    ratio = await RatioTest.deploy();
  });

  describe('RATIO_BASE', async () => {
    it('is 10^6', async () => {
      expect(await ratio.getRatioBase())
        .to.eq(RATIO_BASE)
        .to.eq(10 ** 6);
    });
  });

  describe('applyRatioCeiled', async () => {
    it('reverts for ratios larger than `RATIO_BASE`', async () => {
      const tooLargeRatio = RATIO_BASE.add(1);
      await expect(ratio.applyRatioCeiled(123, tooLargeRatio))
        .to.revertedWithCustomError(ratio, 'RatioOutOfBounds')
        .withArgs(RATIO_BASE, tooLargeRatio);
      await expect(ratio.applyRatioCeiled(123, RATIO_BASE)).not.to.be.reverted;
    });

    it('reverts for too large values that would cause an overflow', async () => {
      const tooLargeValue = ethers.constants.MaxUint256.div(RATIO_BASE).add(1);
      await expect(
        ratio.applyRatioCeiled(tooLargeValue, RATIO_BASE)
      ).to.revertedWithPanic(0x11);

      await expect(ratio.applyRatioCeiled(tooLargeValue.sub(1), RATIO_BASE)).to
        .not.be.reverted;
    });

    it('does not ceil for division without remainder', async () => {
      expect(await ratio.applyRatioCeiled(32, pctToRatio(50))).to.eq(16);
    });

    it('ceils for division with remainder', async () => {
      expect(await ratio.applyRatioCeiled(33, pctToRatio(50))).to.eq(17);
    });
  });
});
