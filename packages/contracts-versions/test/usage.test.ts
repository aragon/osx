import versions from '@aragon/osx-versions';

describe('contract-versions', () => {
  it('should get typechain for a specific version', async () => {
    const v0_7_0_alpha = versions.v0_7_0_alpha;
    const types = await v0_7_0_alpha.typechain();
    expect(types).toBeDefined();
  });

  it('should get active contracts for a specific version', async () => {
    const v0_7_0_alpha = versions.v0_7_0_alpha;
    const activeContracts = await v0_7_0_alpha.active_contracts();
    expect(activeContracts).toBeDefined();
  });
});
