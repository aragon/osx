import {
  VersionComparisonLibTest,
  VersionComparisonLibTest__factory,
} from '../../typechain';
import {expect} from 'chai';
import {ethers} from 'hardhat';

type SemVer = [number, number, number];

describe('VersionComparisonLib', function () {
  let cmp: VersionComparisonLibTest;

  before(async () => {
    const signers = await ethers.getSigners();
    cmp = await new VersionComparisonLibTest__factory(signers[0]).deploy();
  });

  describe('eq', async () => {
    function eq(lhs: SemVer, rhs: SemVer): Promise<boolean> {
      return cmp.eq(lhs, rhs);
    }

    it('returns true if lhs equals rhs', async () => {
      await eqChecks(eq, true);
    });

    it('returns false if lhs does not equal rhs', async () => {
      await ltChecks(eq, false);
      await gtChecks(eq, false);
    });
  });

  describe('neq', async () => {
    function neq(lhs: SemVer, rhs: SemVer): Promise<boolean> {
      return cmp.neq(lhs, rhs);
    }

    it('returns true if lhs does not equal rhs', async () => {
      await ltChecks(neq, true);
      await gtChecks(neq, true);
    });

    it('returns false if lhs equals rhs', async () => {
      await eqChecks(neq, false);
    });
  });

  describe('lt', async () => {
    function lt(lhs: SemVer, rhs: SemVer): Promise<boolean> {
      return cmp.lt(lhs, rhs);
    }

    it('returns true if lhs is less than rhs', async () => {
      await ltChecks(lt, true);
    });

    it('returns false if lhs is not less than rhs', async () => {
      await gtChecks(lt, false);
      await eqChecks(lt, false);
    });
  });

  describe('lte', async () => {
    function lte(lhs: SemVer, rhs: SemVer): Promise<boolean> {
      return cmp.lte(lhs, rhs);
    }

    it('returns true if lhs is less than or equal to rhs', async () => {
      await ltChecks(lte, true);
      await eqChecks(lte, true);
    });

    it('returns false if lhs is not less than or equal to rhs', async () => {
      await gtChecks(lte, false);
    });
  });

  describe('gt', async () => {
    function gt(lhs: SemVer, rhs: SemVer): Promise<boolean> {
      return cmp.gt(lhs, rhs);
    }

    it('returns true if lhs is greater than rhs', async () => {
      await gtChecks(gt, true);
    });

    it('returns false if lhs is not greater than rhs', async () => {
      await ltChecks(gt, false);
      await eqChecks(gt, false);
    });
  });

  describe('gte', async () => {
    function gte(lhs: SemVer, rhs: SemVer): Promise<boolean> {
      return cmp.gte(lhs, rhs);
    }

    it('returns true if lhs is greater than or equal to rhs', async () => {
      await gtChecks(gte, true);
      await eqChecks(gte, true);
    });

    it('returns false if lhs is not greater than or equal to rhs', async () => {
      await ltChecks(gte, false);
    });
  });
});

async function eqChecks(
  func: (lhs: SemVer, rhs: SemVer) => Promise<boolean>,
  expected: boolean
) {
  const results: boolean[] = await Promise.all([
    func([1, 1, 1], [1, 1, 1]),
    //
    func([0, 1, 1], [0, 1, 1]),
    func([1, 0, 1], [1, 0, 1]),
    func([1, 1, 0], [1, 1, 0]),
    //
    func([1, 0, 0], [1, 0, 0]),
    func([0, 1, 0], [0, 1, 0]),
    func([0, 0, 1], [0, 0, 1]),
    //
    func([0, 0, 0], [0, 0, 0]),
  ]);

  // Check that all results match the expected value
  expect(results.every(v => v === expected)).to.be.true;
}

async function ltChecks(
  func: (lhs: SemVer, rhs: SemVer) => Promise<boolean>,
  expected: boolean
) {
  const results: boolean[] = await Promise.all([
    func([1, 1, 1], [2, 1, 1]),
    func([1, 1, 1], [1, 2, 1]),
    func([1, 1, 1], [1, 1, 2]),
    //
    func([1, 1, 1], [1, 2, 2]),
    func([1, 1, 1], [2, 1, 2]),
    func([1, 1, 1], [2, 2, 1]),
    //
    func([1, 1, 1], [2, 2, 2]),
    //
    func([1, 1, 0], [1, 2, 0]),
    func([1, 1, 0], [2, 1, 0]),
    //
    func([1, 1, 0], [2, 2, 0]),
    //
    func([0, 1, 1], [0, 1, 2]),
    func([0, 1, 1], [0, 2, 1]),
    //
    func([0, 1, 1], [0, 2, 2]),
    //
    func([1, 0, 0], [2, 0, 0]),
    func([0, 1, 0], [0, 2, 0]),
    func([0, 0, 1], [0, 0, 2]),
  ]);

  // Check that all results match the expected value
  expect(results.every(v => v === expected)).to.be.true;
}

async function gtChecks(
  func: (lhs: SemVer, rhs: SemVer) => Promise<boolean>,
  expected: boolean
) {
  const results: boolean[] = await Promise.all([
    func([2, 1, 1], [1, 1, 1]),
    func([1, 2, 1], [1, 1, 1]),
    func([1, 1, 2], [1, 1, 1]),
    //
    func([1, 2, 2], [1, 1, 1]),
    func([2, 1, 2], [1, 1, 1]),
    func([2, 2, 1], [1, 1, 1]),
    //
    func([2, 2, 2], [1, 1, 1]),
    //
    func([1, 2, 0], [1, 1, 0]),
    func([2, 1, 0], [1, 1, 0]),
    func([2, 2, 0], [1, 1, 0]),
    //
    func([0, 1, 2], [0, 1, 1]),
    func([0, 2, 1], [0, 1, 1]),
    func([0, 2, 2], [0, 1, 1]),
    //
    func([2, 0, 0], [1, 0, 0]),
    func([0, 2, 0], [0, 1, 0]),
    func([0, 0, 2], [0, 0, 1]),
  ]);

  // Check that all results match the expected value
  expect(results.every(v => v === expected)).to.be.true;
}
