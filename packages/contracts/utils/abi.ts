import {HardhatRuntimeEnvironment} from 'hardhat/types';

export async function getMergedABI(
  hre: HardhatRuntimeEnvironment,
  primaryABI: string,
  secondaryABIs: string[]
): Promise<{abi: any; bytecode: any}> {
  const primaryArtifact = await hre.artifacts.readArtifact(primaryABI);

  const secondariesArtifacts = secondaryABIs.map(
    async name => await hre.artifacts.readArtifact(name)
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
