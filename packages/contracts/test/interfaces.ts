import {
  // core
  IDAO__factory,
  IEIP4824__factory,
  IPermissionCondition__factory,
  IPlugin__factory,
  IMembership__factory,
  IProposal__factory, // framework
  IPluginRepo__factory,
  IPluginSetup__factory, // plugins
  IMajorityVoting__factory,
  IMultisig__factory,
  IMerkleMinter__factory,
  IMerkleDistributor__factory, // token
  IERC20MintableUpgradeable__factory,
  IGovernanceWrappedERC20__factory, // utils
  IProtocolVersion__factory,
} from '../typechain';
import {IDAO__factory as IDAO_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/dao/IDAO.sol';
import {IEIP4824__factory as IEIP4824_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/dao/IEIP4824.sol';
import {IPermissionCondition__factory as IPermissionCondition_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/permission/IPermissionCondition.sol';
import {IPlugin__factory as IPlugin_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/plugin/IPlugin.sol';
import {IMembership__factory as IMembership_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/plugin/membership/IMembership.sol';
import {IProposal__factory as IProposal_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/plugin/proposal/IProposal.sol';
import {IPluginRepo__factory as IPluginRepo_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/framework/plugin/repo/IPluginRepo.sol';
import {IPluginSetup__factory as IPluginSetup_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/framework/plugin/setup/IPluginSetup.sol';
import {IMajorityVoting__factory as IMajorityVoting_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/plugins/governance/majority-voting/IMajorityVoting.sol';
import {IMultisig__factory as IMultisig_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/plugins/governance/multisig/IMultisig.sol';
import {IMerkleDistributor__factory as IMerkleDistributor_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/plugins/token/IMerkleDistributor.sol';
import {IMerkleMinter__factory as IMerkleMinter_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/plugins/token/IMerkleMinter.sol';
import {IERC20MintableUpgradeable__factory as IERC20MintableUpgradeable_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/token/ERC20/IERC20MintableUpgradeable.sol';
import {IGovernanceWrappedERC20__factory as IGovernanceWrappedERC20_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/token/ERC20/governance/IGovernanceWrappedERC20.sol';
// TODO: For some reason this file is missing.
import {IProtocolVersion__factory as IProtocolVersion_V1_3_0__factory} from '../typechain/@aragon/osx-v1.3.0-rc0.2/utils/protocol/IProtocolVersion.sol';
import {getInterfaceID} from './test-utils/interfaces';
import {expect} from 'chai';

describe('Interfaces', function () {
  context('introduced in v1.0.0', function () {
    describe('IDAO', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IDAO__factory.createInterface());
        const initial = getInterfaceID(IDAO_V1_0_0__factory.createInterface());
        expect(current).to.equal(initial);
      });
    });

    describe('IEIP4824', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IEIP4824__factory.createInterface());
        const initial = getInterfaceID(
          IEIP4824_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IPermissionCondition', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IPermissionCondition__factory.createInterface()
        );
        const initial = getInterfaceID(
          IPermissionCondition_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });
    describe('IPlugin', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IPlugin__factory.createInterface());
        const initial = getInterfaceID(
          IPlugin_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IMembership', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IMembership__factory.createInterface());
        const initial = getInterfaceID(
          IMembership_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IProposal', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IProposal__factory.createInterface());
        const initial = getInterfaceID(
          IProposal_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IPluginRepo', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IPluginRepo__factory.createInterface());
        const initial = getInterfaceID(
          IPluginRepo_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IPluginSetup', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IPluginSetup__factory.createInterface());
        const initial = getInterfaceID(
          IPluginSetup_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    // plugins
    describe('IMajorityVoting', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IMajorityVoting__factory.createInterface()
        );
        const initial = getInterfaceID(
          IMajorityVoting_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IMultisig', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(IMultisig__factory.createInterface());
        const initial = getInterfaceID(
          IMultisig_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IMerkleMinter', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IMerkleMinter__factory.createInterface()
        );
        const initial = getInterfaceID(
          IMerkleMinter_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IMerkleDistributor', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IMerkleDistributor__factory.createInterface()
        );
        const initial = getInterfaceID(
          IMerkleDistributor_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    // tokens
    describe('IERC20MintableUpgradeable', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IERC20MintableUpgradeable__factory.createInterface()
        );
        const initial = getInterfaceID(
          IERC20MintableUpgradeable_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IGovernanceWrappedERC20', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IGovernanceWrappedERC20__factory.createInterface()
        );
        const initial = getInterfaceID(
          IGovernanceWrappedERC20_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });
  });

  // utils
  context('introduced in v1.3.0', function () {
    describe('IProtocolVersion', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceID(
          IProtocolVersion__factory.createInterface()
        );
        const initial = getInterfaceID(
          IProtocolVersion_V1_3_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });
  });
});
