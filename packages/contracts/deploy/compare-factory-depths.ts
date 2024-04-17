import {HardhatRuntimeEnvironment} from 'hardhat/types';

export async function extractFactoryDepsByZkSync(
  hre: HardhatRuntimeEnvironment,
  artifact: any
): Promise<string[]> {
  const visited = new Set<string>();
  visited.add(`${artifact.sourceName}:${artifact.contractName}`);
  return await _extractFactoryDepsRecursive(hre, artifact, visited);
}

export async function _extractFactoryDepsRecursive(
  hre: HardhatRuntimeEnvironment,
  artifact: any,
  visited: Set<string>
): Promise<string[]> {
  // Load all the dependency bytecodes.
  // We transform it into an array of bytecodes.
  const factoryDeps: string[] = [];
  for (const dependencyHash in artifact.factoryDeps) {
    if (!dependencyHash) continue;
    const dependencyContract = artifact.factoryDeps[dependencyHash];
    if (!visited.has(dependencyContract)) {
      const dependencyArtifact = await hre.artifacts.readArtifact(
        dependencyContract
      );
      //   if (
      //     dependencyArtifact.bytecode.includes(
      //       '0x00040000000000020006000000000002000000000301001900000060033002700000008a04300197000300000041035500020000000103550000008a0030019d000100000000001f0000008001000039000000400010043f000000000100003100000001022001900000003c0000c13d0000009202000041000000000202041a0000008e02200197000000000301004b000000480000c13d0000000001000414000000040320008c000000660000613d0000008a030000410000008a0410009c0000000001038019000000c0011002100224021f0000040f0003000000010355000000000301001900000060043002700000001f0340018f0001008a0040019d0000008a04400197000'
      //     )
      //   ) {
      //     console.log(dependencyArtifact, ' dependencyartifact');
      //   }
      factoryDeps.push(dependencyArtifact.bytecode);
      visited.add(dependencyContract);
      const transitiveDeps = await _extractFactoryDepsRecursive(
        hre,
        dependencyArtifact,
        visited
      );
      factoryDeps.push(...transitiveDeps);
    }
  }

  return factoryDeps;
}

export async function extractFactoryDepsByHardhatDeploy(
  hre: HardhatRuntimeEnvironment,
  artifact: any
) {
  // Load all the dependency bytecodes.
  // We transform it into an array of bytecodes.
  const factoryDeps = [];
  for (const dependencyHash in artifact.factoryDeps) {
    const dependencyContract = artifact.factoryDeps[dependencyHash];
    const dependencyBytecodeString = (
      await hre.artifacts.readArtifact(dependencyContract)
    ).bytecode;
    factoryDeps.push(dependencyBytecodeString);
  }
  return factoryDeps;
}
