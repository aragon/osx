import {DAO__factory, Executor__factory, MultiBodySetup, MultiBodySetup__factory, MultiBody__factory, Multisig, MultisigSetupV2__factory, MultisigV2, MultisigV2__factory, Multisig__factory, PluginA, PluginA__factory, PluginRepoFactory__factory, PluginRepoRegistry__factory, PluginRepo__factory, PluginSetupProcessor__factory, Target__factory} from '../../typechain';
import {
  deployMultibody,
  deployPluginA,
  deployPluginB,
} from './helpers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {exec} from 'child_process';
import {BigNumber, Signer} from 'ethers';
import {getAddress, parseEther} from 'ethers/lib/utils';
import {deployments, ethers, upgrades} from 'hardhat';
import hre from 'hardhat';
import { initializeDeploymentFixture } from '../test-utils/fixture';
import { findEvent, findEventTopicLog } from '../../utils/event';
import { PluginRepoRegisteredEvent } from '../../typechain/PluginRepoRegistry';
import { InstallationPreparedEvent, UpdatePreparedEvent } from '../../typechain/PluginSetupProcessor';
import { encodeMultisig_createProposalCall, encodePluginA_createProposalCall, multibodyApplyInstallation, multibodyPrepareInstallation, multisigApplyUpdate, multisigPrepareUpdate, pspPermissions, pspPermissions } from './actions';

async function getSingletonFactory(signer: Signer) {
  const factoryAddress = getAddress(
    '0xce0042b868300000d44a59004da54a005ffdcf9f'
  );
  const deployerAddress = getAddress(
    '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D'
  );

  const provider = signer.provider;
  if (!provider) return;
  // check if singleton factory is deployed.
  if ((await provider.getCode(factoryAddress)) === '0x') {
    // fund the singleton factory deployer account
    await signer.sendTransaction({
      to: deployerAddress,
      value: parseEther('0.0247'),
    });

    // deploy the singleton factory
    await (
      await provider.sendTransaction(
        '0xf9016c8085174876e8008303c4d88080b90154608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c634300060200331b83247000822470'
      )
    )?.wait();

    if ((await provider.getCode(factoryAddress)) == '0x') {
      throw Error('Singleton factory could not be deployed to correct address');
    }
  }
}

async function deployAll() {
  await initializeDeploymentFixture('New');
}

async function deployMultibodyPluginRepo(signer: SignerWithAddress) {
  const multibodySetupFactory = new MultiBodySetup__factory(signer);
  let multibodySetup = await multibodySetupFactory.deploy();

  const pluginRepoFactoryDeployment = await deployments.get('PluginRepoFactory');
  const pluginRepoFactory = PluginRepoFactory__factory.connect(pluginRepoFactoryDeployment.address, signer)
  const tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
    "multibodysetupdomain", 
    multibodySetup.address, 
    signer.address, 
    ethers.utils.id('release-metadata'), 
    ethers.utils.id('build-metadata')
  )

  const event = await findEventTopicLog<PluginRepoRegisteredEvent>(
    tx,
    PluginRepoRegistry__factory.createInterface(),
    'PluginRepoRegistered'
  );
  return event.args.pluginRepo;
}

describe.only('my tests', async () => {
  let signers: SignerWithAddress[];
  let multisig: Multisig;
  let pluginA: PluginA;

  before(async () => {
    signers = await ethers.getSigners();
    await getSingletonFactory(signers[0]);

    // deploy framework
    await deployAll();

    multisig = Multisig__factory.connect(
      hre.managingDAOMultisigPluginAddress,
      signers[0]
    );

    expect(await multisig.isListed(signers[0].address)).to.be.true
  })

  it('check whether multisig works initially', async () => {
    const targetDeployment = await deployments.get('Target')
    const target = Target__factory.connect(targetDeployment.address, signers[0])
    
    // Check that multisig proposal works well

    await multisig.createProposal(ethers.utils.id('some metadata'), [{
      to: target.address,
      value: 0,
      data: Target__factory.createInterface().encodeFunctionData('setValue', [30])
    }], 0, true, true, 0, Date.now() + 30000)
    
    // mulitisig proposal must have updated the value
    expect(await target.val()).to.equal(30)
  });

  it('actual test', async () => {
    const multibodyPluginRepoAddr = await deployMultibodyPluginRepo(signers[0])

    const multisigV2SetupFactory = new MultisigSetupV2__factory(signers[0]);
    let multisigV2Setup = await multisigV2SetupFactory.deploy();

    const multisigPluginRepo = PluginRepo__factory.connect(hre.aragonPluginRepos['multisig'], signers[0])

    await multisigPluginRepo.createVersion(
      1, 
      multisigV2Setup.address, 
      ethers.utils.id('build-metadata'), 
      ethers.utils.id('release-metadata')
    )

    const pspDeployment = await deployments.get('PluginSetupProcessor');
    const psp = PluginSetupProcessor__factory.connect(pspDeployment.address, signers[0])
    const daoAddr = await multisig.dao()

    const actions = [
      multibodyPrepareInstallation(psp.address, daoAddr, multibodyPluginRepoAddr),
      multisigPrepareUpdate(psp.address,daoAddr,multisigPluginRepo.address,multisig.address)
    ]

    const tx = await multisig.createProposal(
      ethers.utils.id('metadata'), 
      actions, 
      0, 
      true, 
      true, 
      0, 
      Date.now() + 30000
    )

    const eventPrepareInstalled = await findEventTopicLog<InstallationPreparedEvent>(tx,  PluginSetupProcessor__factory.createInterface(), 'InstallationPrepared')
    const eventPrepareUpdated = await findEventTopicLog<UpdatePreparedEvent>(tx,  PluginSetupProcessor__factory.createInterface(), 'UpdatePrepared')

    const multibody = MultiBody__factory.connect(eventPrepareInstalled.args.plugin, signers[0])
    const multibodyPermissions = eventPrepareInstalled.args.preparedSetupData.permissions;
    
    // stage 2 plugin
    const multibodyExecutor = await multibody.executor()
    const pluginAFactory = new PluginA__factory(signers[0])
    pluginA = await pluginAFactory.deploy(multibodyExecutor)

    const newActions = [
      // grant psp UPGRADE PERMISSION to multisig so it can upgrade the plugin to new implementation
      ...pspPermissions(daoAddr, psp.address, multisig.address),
      // apply update for multisig so it becomes multisig v2 that contains setExecutor new logic
      multisigApplyUpdate(
        psp.address, 
        daoAddr, 
        multisig.address, 
        multisigPluginRepo.address, 
        eventPrepareUpdated.args.preparedSetupData.permissions
      ),
      // apply install the multibody
      multibodyApplyInstallation(
        psp.address, 
        daoAddr, 
        multibodyPluginRepoAddr, 
        multibody.address, 
        multibodyPermissions
      ),
      // set executor on the multisig 
      {
        to: multisig.address,
        value: 0,
        data: MultisigV2__factory.createInterface().encodeFunctionData('setExecutor', [await multibody.executor()])
      },
      {
        to: multibody.address,
        value: 0,
        data: MultiBody__factory.createInterface().encodeFunctionData('updateStages', [
          [
            {
              plugins: [pluginA.address],
              allowedBodies: [pluginA.address],
              maxDuration: 3000000,
              minDuration: 0,
              resultThreshold: 1,
              isOptimistic: false
            },
            {
              plugins: [multisig.address],
              allowedBodies: [multisig.address],
              maxDuration: 3000000,
              minDuration: 0,
              resultThreshold: 1,
              isOptimistic: false
            },
          ],
          ethers.utils.id('pluginMetadataABIs')
        ])
      },
      {
        to: daoAddr,
        value: 0,
        data: DAO__factory.createInterface().encodeFunctionData('grant', [multisig.address, multibody.address, ethers.utils.id('CREATE_PROPOSAL_PERMISSION')])
      },
      // revoke execute permission from multisig on dao, so it can't no longer continue 
      // using the same flow(i.e must use multibody)
      {
        to: daoAddr,
        value: 0,
        data: DAO__factory.createInterface().encodeFunctionData('revoke', [daoAddr, multisig.address, ethers.utils.id('EXECUTE_PERMISSION')])
      }
    ]

    await multisig.createProposal(ethers.utils.id('metadata'), newActions, 0, true, true, 0, Date.now() + 3000)
    
    // Interface of multisig changed, so let's use the new one
    let multisigV2 = MultisigV2__factory.connect(multisig.address, signers[0])
    expect(await multisigV2.executor()).to.equal(await multibody.executor());

    // Time to test multibody now
    const finalTargetValue = 590;
    const multibodyActions = [
      {
        to: (await deployments.get('Target')).address,
        value: 0,
        data: new ethers.utils.Interface(
          Target__factory.abi
        ).encodeFunctionData('setValue', [finalTargetValue]),
      },
    ];
    
    const predictedProposalId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [
          'tuple(address to,uint256 value,bytes data)[]',
          'uint256',
          'bytes',
          'address',
          'uint256',
          'address',
        ],
        [
          multibodyActions,
          0,
          ethers.utils.id('proposalMetadata'),
          multibody.address,
          31337, //chain id of hardhat
          signers[0].address
        ]
      )
    );

    const creationProposalsCalldatas = [
      [
        encodePluginA_createProposalCall(
          multibody.address,
          predictedProposalId
        ),
      ],
      [
        encodeMultisig_createProposalCall(
          multibody.address,
          predictedProposalId
        )
      ]
    ];

    // Note that stage 1 has pluginA contract and stage 2 has multisig
    await multibody.createProposal(
      multibodyActions,
      0,
      ethers.utils.id('proposalMetadata'),
      creationProposalsCalldatas
    )

    // Check that proposal was created on pluginA
    expect(await pluginA.created()).to.be.true

    // Execute pluginA so it calls multibody's advanceProposal
    await pluginA.execute(0, {gasLimit: 200000000})

    // check that proposal was created on multisig
    const proposal = await multisigV2.getProposal(3)
    expect(proposal.actions.length).to.equal(1);

    const targetDeployment = await deployments.get('Target')
    const target = Target__factory.connect(targetDeployment.address, signers[0])
    
    // check that value on target is still 30 and 
    // hasn't been applied the multibody action yet
    expect(await target.val()).to.equal(30)
    
    await multisigV2.approve(3, true, {gasLimit: 20000000})

    expect(await target.val()).to.equal(finalTargetValue)
  })
});
