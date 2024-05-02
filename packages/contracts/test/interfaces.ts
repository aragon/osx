import {
  IDAO__factory,
  IEIP4824__factory,
  IPermissionCondition__factory,
  IPlugin__factory,
  IMembership__factory,
  IProposal__factory,
  IPluginRepo__factory,
  IPluginSetup__factory,
  IMajorityVoting__factory,
  IMultisig__factory,
  IERC20MintableUpgradeable__factory,
  IGovernanceWrappedERC20__factory,
  IProtocolVersion__factory,
} from '../typechain';
import {IDAO__factory as IDAO_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/dao/IDAO.sol';
import {IEIP4824__factory as IEIP4824_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/dao/IEIP4824.sol';
import {IPermissionCondition__factory as IPermissionCondition_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/permission/IPermissionCondition.sol';
import {IPlugin__factory as IPlugin_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/plugin/IPlugin.sol';
import {IMembership__factory as IMembership_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/plugin/membership/IMembership.sol';
import {IProposal__factory as IProposal_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/core/plugin/proposal/IProposal.sol';
import {IPluginSetup__factory as IPluginSetup_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/framework/plugin/setup/IPluginSetup.sol';
import {IMajorityVoting__factory as IMajorityVoting_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/plugins/governance/majority-voting/IMajorityVoting.sol';
import {IMultisig__factory as IMultisig_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/plugins/governance/multisig/IMultisig.sol';
import {IERC20MintableUpgradeable__factory as IERC20MintableUpgradeable_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/token/ERC20/IERC20MintableUpgradeable.sol';
import {IGovernanceWrappedERC20__factory as IGovernanceWrappedERC20_V1_0_0__factory} from '../typechain/@aragon/osx-v1.0.1/token/ERC20/governance/IGovernanceWrappedERC20.sol';
import {IProtocolVersion__factory as IProtocolVersion_V1_3_0__factory} from '../typechain/@aragon/osx-v1.3.0/utils/protocol/IProtocolVersion.sol';
import {getInterfaceId} from '@aragon/osx-commons-sdk';
import {expect} from 'chai';

describe('Interfaces', function () {
  context('introduced in v1.0.0', function () {
    describe('IDAO', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IDAO__factory.createInterface());
        const initial = getInterfaceId(IDAO_V1_0_0__factory.createInterface());
        expect(current).to.equal(initial);
      });
    });

    describe('IEIP4824', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IEIP4824__factory.createInterface());
        const initial = getInterfaceId(
          IEIP4824_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IPermissionCondition', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(
          IPermissionCondition__factory.createInterface()
        );
        const initial = getInterfaceId(
          IPermissionCondition_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });
    describe('IPlugin', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IPlugin__factory.createInterface());
        const initial = getInterfaceId(
          IPlugin_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IMembership', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IMembership__factory.createInterface());
        const initial = getInterfaceId(
          IMembership_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IProposal', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IProposal__factory.createInterface());
        const initial = getInterfaceId(
          IProposal_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IPluginSetup', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IPluginSetup__factory.createInterface());
        const initial = getInterfaceId(
          IPluginSetup_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    // plugins
    describe('IMajorityVoting', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(
          IMajorityVoting__factory.createInterface()
        );
        const initial = getInterfaceId(
          IMajorityVoting_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IMultisig', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(IMultisig__factory.createInterface());
        const initial = getInterfaceId(
          IMultisig_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    // tokens
    describe('IERC20MintableUpgradeable', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(
          IERC20MintableUpgradeable__factory.createInterface()
        );
        const initial = getInterfaceId(
          IERC20MintableUpgradeable_V1_0_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });

    describe('IGovernanceWrappedERC20', function () {
      it('has still the same interface ID', async () => {
        const current = getInterfaceId(
          IGovernanceWrappedERC20__factory.createInterface()
        );
        const initial = getInterfaceId(
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
        const current = getInterfaceId(
          IProtocolVersion__factory.createInterface()
        );
        const initial = getInterfaceId(
          IProtocolVersion_V1_3_0__factory.createInterface()
        );
        expect(current).to.equal(initial);
      });
    });
  });
});
