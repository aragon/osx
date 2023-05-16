import {
  v1_0_0_active_contracts,
  v1_2_0_active_contracts,
} from '@aragon/osx-versions';

describe('contract-versions', () => {
  it('should get active contracts for a specific version', async () => {
    const activeContracts101 = v1_0_0_active_contracts;
    expect(activeContracts101).toBeDefined();

    const activeContracts120 = v1_2_0_active_contracts;
    expect(activeContracts120).toBeDefined();
  });

  it('should not have mumbai deployment', async () => {
    const activeContracts101: Record<string, any> = v1_0_0_active_contracts;
    expect(activeContracts101['mumbai']).toBeUndefined();
  });

  it('should have mumbai deployment', async () => {
    const activeContracts120 = v1_2_0_active_contracts;
    expect(activeContracts120.mumbai).toBeTruthy();
  });
});
