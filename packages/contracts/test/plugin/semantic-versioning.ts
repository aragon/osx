import {expect} from 'chai';
import {ethers} from 'hardhat';

import {SemanticVersioningMock} from '../../typechain';

describe('isValidBump', function () {
  let mock: SemanticVersioningMock;

  before(async () => {
    const SemanticVersioningMock = await ethers.getContractFactory(
      'SemanticVersioningMock'
    );
    mock = await SemanticVersioningMock.deploy();
  });

  it('accepts major updates', async () => {
    expect(await mock.isValidBump([1, 0, 0], [2, 0, 0])).to.equal(true);
  });

  it('accepts minor updates', async () => {
    expect(await mock.isValidBump([1, 0, 0], [1, 1, 0])).to.equal(true);
  });

  it('accepts patch updates', async () => {
    expect(await mock.isValidBump([1, 0, 0], [1, 0, 1])).to.equal(true);
  });

  it('denies upgrades to the same version', async () => {
    expect(await mock.isValidBump([1, 0, 0], [1, 0, 0])).to.equal(false);
    expect(await mock.isValidBump([1, 1, 0], [1, 1, 0])).to.equal(false);
    expect(await mock.isValidBump([1, 1, 1], [1, 1, 1])).to.equal(false);
    expect(await mock.isValidBump([0, 1, 1], [0, 1, 1])).to.equal(false);
    expect(await mock.isValidBump([0, 0, 1], [0, 0, 1])).to.equal(false);
  });

  it('denies downgrades', async () => {
    expect(await mock.isValidBump([1, 0, 0], [0, 0, 0])).to.equal(false);
    expect(await mock.isValidBump([1, 1, 0], [1, 0, 0])).to.equal(false);
    expect(await mock.isValidBump([1, 1, 1], [1, 1, 0])).to.equal(false);
    expect(await mock.isValidBump([0, 1, 1], [0, 0, 1])).to.equal(false);
    expect(await mock.isValidBump([0, 0, 1], [0, 0, 0])).to.equal(false);
  });
});
