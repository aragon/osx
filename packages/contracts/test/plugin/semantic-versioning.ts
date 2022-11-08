import {expect} from 'chai';
import {ethers} from 'hardhat';

import {SemanticVersioningMock} from '../../typechain';

describe('Semantic Versioning', function () {
  let mock: SemanticVersioningMock;

  before(async () => {
    const SemanticVersioningMock = await ethers.getContractFactory(
      'SemanticVersioningMock'
    );
    mock = await SemanticVersioningMock.deploy();
  });

  describe('isValidBumpLoose', function () {
    it('accepts major updates, also if the bump is greater than 1', async () => {
      expect(await mock._isValidBumpLoose([1, 0, 0], [2, 0, 0])).to.equal(true);
      expect(await mock._isValidBumpLoose([1, 0, 0], [3, 0, 0])).to.equal(true);
    });

    it('accepts minor updates, also if the bump is greater than 1', async () => {
      expect(await mock._isValidBumpLoose([1, 0, 0], [1, 1, 0])).to.equal(true);
      expect(await mock._isValidBumpLoose([1, 0, 0], [1, 2, 0])).to.equal(true);
    });
    it('accepts patch updates, also if the bump is greater than 1', async () => {
      expect(await mock._isValidBumpLoose([1, 0, 0], [1, 0, 1])).to.equal(true);
      expect(await mock._isValidBumpLoose([1, 0, 0], [1, 0, 2])).to.equal(true);
    });

    it('accepts a bump if subordinate elements are not decreased to 0', async function () {
      expect(await mock._isValidBumpLoose([0, 1, 0], [0, 2, 1])).to.equal(true);
      expect(await mock._isValidBumpLoose([2, 1, 0], [2, 2, 1])).to.equal(true);
      expect(await mock._isValidBumpLoose([0, 1, 2], [1, 1, 2])).to.equal(true);
    });

    it('rejects updates to the same version', async () => {
      expect(await mock._isValidBumpLoose([1, 0, 0], [1, 0, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([1, 1, 0], [1, 1, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([1, 1, 1], [1, 1, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([0, 1, 1], [0, 1, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([0, 0, 1], [0, 0, 1])).to.equal(
        false
      );
    });

    it('rejects downgrades', async () => {
      expect(await mock._isValidBumpLoose([1, 0, 0], [0, 0, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([1, 1, 0], [1, 0, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([1, 1, 1], [1, 1, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([0, 1, 1], [0, 0, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpLoose([0, 0, 1], [0, 0, 0])).to.equal(
        false
      );
    });

    it('accepts updates from version 0.0.0', async function () {
      expect(await mock._isValidBumpLoose([0, 0, 0], [0, 0, 1])).to.equal(true);
      expect(await mock._isValidBumpLoose([0, 0, 0], [0, 1, 0])).to.equal(true);
      expect(await mock._isValidBumpLoose([0, 0, 0], [1, 0, 0])).to.equal(true);
    });

    it('works with the `tpye(uint16).max` values', async function () {
      const maxUint16Value = Math.pow(2, 16) - 1; // 65535
      expect(
        await mock._isValidBumpLoose(
          [0, 0, maxUint16Value],
          [0, 0, maxUint16Value - 1]
        )
      ).to.equal(false);
    });
  });

  describe('isValidBumpStrict', function () {
    it('accepts major updates if the bump is exactly 1', async () => {
      expect(await mock._isValidBumpStrict([1, 0, 0], [2, 0, 0])).to.equal(
        true
      );
      expect(await mock._isValidBumpStrict([1, 0, 0], [3, 0, 0])).to.equal(
        false
      );
    });

    it('accepts minor updates if the bump is exactly 1', async () => {
      expect(await mock._isValidBumpStrict([1, 0, 0], [1, 1, 0])).to.equal(
        true
      );
      expect(await mock._isValidBumpStrict([1, 0, 0], [1, 2, 0])).to.equal(
        false
      );
    });

    it('accepts patch updates if the bump is exactly 1', async () => {
      expect(await mock._isValidBumpStrict([1, 0, 0], [1, 0, 1])).to.equal(
        true
      );
      expect(await mock._isValidBumpStrict([1, 0, 0], [1, 0, 3])).to.equal(
        false
      );
    });

    it('accepts a bump of 1 if subordinate elements are decreased to 0', async function () {
      expect(await mock._isValidBumpStrict([1, 4, 7], [2, 0, 0])).to.equal(
        true
      );
      expect(await mock._isValidBumpStrict([147, 4, 7], [147, 5, 0])).to.equal(
        true
      );
    });

    it('rejects a bump of 1 if subordinate elements are not decreased to 0', async function () {
      expect(await mock._isValidBumpStrict([0, 1, 0], [0, 2, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([2, 1, 0], [2, 2, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([0, 1, 2], [1, 1, 2])).to.equal(
        false
      );
    });

    it('rejects updates to the same version', async () => {
      expect(await mock._isValidBumpStrict([1, 0, 0], [1, 0, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([1, 1, 0], [1, 1, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([1, 1, 1], [1, 1, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([0, 1, 1], [0, 1, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([0, 0, 1], [0, 0, 1])).to.equal(
        false
      );
    });

    it('rejects downgrades', async () => {
      expect(await mock._isValidBumpStrict([1, 0, 0], [0, 0, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([1, 1, 0], [1, 0, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([1, 1, 1], [1, 1, 0])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([0, 1, 1], [0, 0, 1])).to.equal(
        false
      );
      expect(await mock._isValidBumpStrict([0, 0, 1], [0, 0, 0])).to.equal(
        false
      );
    });

    it('accepts updates from version 0.0.0', async function () {
      expect(await mock._isValidBumpStrict([0, 0, 0], [0, 0, 1])).to.equal(
        true
      );
      expect(await mock._isValidBumpStrict([0, 0, 0], [0, 1, 0])).to.equal(
        true
      );
      expect(await mock._isValidBumpStrict([0, 0, 0], [1, 0, 0])).to.equal(
        true
      );
    });

    it('works with the `tpye(uint16).max` values', async function () {
      const maxUint16Value = Math.pow(2, 16) - 1; // 65535
      expect(
        await mock._isValidBumpStrict(
          [0, 0, maxUint16Value],
          [0, 0, maxUint16Value - 1]
        )
      ).to.equal(false);
    });
  });
});
