import {ethers} from 'hardhat';

export async function getMergedABI(
  hre: any,
  primary: string,
  secondaries: string[]
): Promise<{abi: any; bytecode: any}> {
  // @ts-ignore
  const primaryArtifact = await hre.artifacts.readArtifact(primary);

  const secondariesArtifacts = secondaries.map(
    async name => await hre.artifacts.readArtifact('PluginRepoRegistry')
  );

  const _merged = [...primaryArtifact.abi];

  for (let i = 0; i < secondariesArtifacts.length; i++) {
    const artifact = await secondariesArtifacts[i];
    _merged.push(...artifact.abi.filter((f: any) => f.type === 'event'));
  }

  // remove duplicated events
  const merged = _merged.filter(
    (value, index, self) =>
      index === self.findIndex(event => event.name === value.name)
  );

  return {
    abi: merged,
    bytecode: primaryArtifact.bytecode,
  };
}
