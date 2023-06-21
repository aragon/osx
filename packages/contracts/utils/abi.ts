import {Artifact, HardhatRuntimeEnvironment} from 'hardhat/types';

export async function getMergedABI(
  hre: HardhatRuntimeEnvironment,
  primaryABI: string,
  secondaryABIs: string[]
): Promise<{abi: any; bytecode: any}> {
  const primaryArtifact = await hre.artifacts.readArtifact(primaryABI);
  // read all secondary artifacts
  const secondariesArtifacts = await Promise.all(
    secondaryABIs.map((abi: string) => hre.artifacts.readArtifact(abi))
  );
  const _merged = [...primaryArtifact.abi];

  // filter events from secondaries artifacts
  for (const artifact of secondariesArtifacts) {
    _merged.push(...artifact.abi.filter(f => f.type === 'event'));
  }

  // remove duplicated events
  const merged = _merged.filter((value, index, self) => {
    // filter events that meet the following conditions:
    // - have the same name
    // - have the same number of inputs
    // - every input of both events have the same type and name
    return (
      index ===
      self.findIndex(event => {
        return (
          // check both events have the same name
          event.name === value.name &&
          // chgeck both events have the same number of inputs
          event.inputs.length === value.inputs.length &&
          // check every input of both events have the same type and name
          event.inputs.every((input: any, i: number) => {
            return (
              input.type === value.inputs[i].type &&
              input.name === value.inputs[i].name
            );
          })
        );
      })
    );
  });

  return {
    abi: merged,
    bytecode: primaryArtifact.bytecode,
  };
}
