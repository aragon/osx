import {DeployOptions, NetworkDeployment} from '.';
import {BigNumberish, Contract, providers} from 'ethers';
import {utils} from 'ethers';
import hre from 'hardhat';

export class HardhatClass implements NetworkDeployment {
  provider: providers.BaseProvider;
  constructor(_provider: providers.BaseProvider) {
    this.provider = _provider;
  }

  async deploy(artifactName: string, args: any[] = []) {
    const {ethers} = hre;
    const signers = await ethers.getSigners();
    const artifact = await hre.artifacts.readArtifact(artifactName);
    let contract = await new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signers[0]
    ).deploy(...args);

    return {artifact, contract};
  }

  async encodeFunctionData(
    artifactName: string,
    functionName: string,
    args: any[]
  ): Promise<string> {
    const {ethers} = hre;
    const signers = await ethers.getSigners();
    const artifact = await hre.artifacts.readArtifact(artifactName);
    const contract = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signers[0]
    );

    const fragment = contract.interface.getFunction(functionName);
    return contract.interface.encodeFunctionData(fragment, args);
  }

  getCreateAddress(sender: string, nonce: BigNumberish): string {
    return utils.getContractAddress({from: sender, nonce: nonce});
  }

  async getNonce(
    sender: string,
    type?: 'Deployment' | 'Transaction'
  ): Promise<number> {
    return this.provider.getTransactionCount(sender);
  }

  async deployProxy(
    deployer: number,
    artifactName: string,
    options: DeployOptions
  ): Promise<Contract> {
    const {ethers} = hre;
    const signer = (await ethers.getSigners())[deployer];

    const artifact = await hre.artifacts.readArtifact(artifactName);
    const contract = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );

    // Currently, it doesn't use type and always deployes with uups
    return hre.upgrades.deployProxy(contract, options.initArgs, {
      kind: options.proxySettings?.type,
      initializer: options.proxySettings?.initializer ?? false,
      unsafeAllow: ['constructor'],
      constructorArgs: options.args,
    });
  }

  async upgradeProxy(
    upgrader: number,
    proxyAddress: string,
    newArtifactName: string,
    options: DeployOptions
  ): Promise<Contract> {
    const {ethers} = hre;
    const signer = (await ethers.getSigners())[upgrader];

    const artifact = await hre.artifacts.readArtifact(newArtifactName);

    let contract = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );

    return hre.upgrades.upgradeProxy(proxyAddress, contract, {
      unsafeAllow: ['constructor'],
      constructorArgs: options.args,
    });
  }
}
