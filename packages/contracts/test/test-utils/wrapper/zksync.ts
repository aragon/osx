import {DeployOptions, NetworkDeployment} from '.';
import {getTime} from '../voting';
import {BigNumber, BigNumberish, Contract} from 'ethers';
import hre from 'hardhat';
import {Provider} from 'zksync-ethers';
import {utils, ContractFactory} from 'zksync-ethers';

export class ZkSync implements NetworkDeployment {
  provider: Provider;
  constructor(_provider: Provider) {
    this.provider = _provider;
  }

  async deploy(artifactName: string, args: any[] = []) {
    const {deployer} = hre;
    const artifact = await deployer.loadArtifact(artifactName);
    const contract = await deployer.deploy(artifact, args);
    // TODO:Claudia this seems to be printed twice..
    // console.log('movida good');

    return {artifact, contract};
  }

  async encodeFunctionData(
    artifactName: string,
    functionName: string,
    args: any[]
  ): Promise<string> {
    const {deployer} = hre;
    const artifact = await deployer.loadArtifact(artifactName);
    const contract = new ContractFactory(
      artifact.abi,
      artifact.bytecode,
      await deployer.getWallet()
    );

    const fragment = contract.interface.getFunction(functionName);
    return contract.interface.encodeFunctionData(fragment, args);
  }

  getCreateAddress(sender: string, nonce: BigNumberish): string {
    return utils.createAddress(sender, nonce);
  }

  async getNonce(
    sender: string,
    type: 'Deployment' | 'Transaction' = 'Deployment'
  ): Promise<number> {
    if (type == 'Deployment') {
      const {ethers} = hre;
      const NONCE_HOLDER_ADDRESS = '0x0000000000000000000000000000000000008003';
      const abi = [
        'function getDeploymentNonce(address) public view returns(uint256)',
      ];
      let signers = await ethers.getSigners();
      let contract = new ethers.Contract(NONCE_HOLDER_ADDRESS, abi, signers[0]);
      const nonce = await contract.getDeploymentNonce(sender);
      return BigNumber.from(nonce).toNumber();
    }

    return this.provider.getTransactionCount(sender);
  }

  // currently, type is not used and always deploys with UUPS
  async deployProxy(
    deployer: number,
    artifactName: string,
    options: DeployOptions
  ): Promise<Contract> {
    const wallets = await hre.zksyncEthers.getWallets();
    const artifact = await hre.deployer.loadArtifact(artifactName);

    return hre.zkUpgrades.deployProxy(
      wallets[deployer],
      artifact,
      options.initArgs,
      {
        kind: options.proxySettings?.type,
        unsafeAllow: ['constructor'],
        constructorArgs: options.args,
        initializer: options.proxySettings?.initializer,
      },
      true
    );
  }

  async upgradeProxy(
    upgrader: number,
    proxyAddress: string,
    newArtifactName: string,
    options: DeployOptions
  ): Promise<Contract> {
    const wallets = await hre.zksyncEthers.getWallets();
    const newArtifact = await hre.deployer.loadArtifact(newArtifactName);

    return hre.zkUpgrades.upgradeProxy(
      wallets[upgrader],
      proxyAddress,
      newArtifact,
      {
        unsafeAllow: ['constructor'],
        constructorArgs: options.args,
        // TODO: pass initiailizer and initArgs
      },
      true
    );
  }
}
