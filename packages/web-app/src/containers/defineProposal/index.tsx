import React from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components';
import {
  ButtonWallet,
  Label,
  TextareaSimple,
  TextareaWYSIWYG,
  TextInput,
} from '@aragon/ui-components';
import {useWallet} from 'context/augmentedWallet';
import {useWalletProps} from 'containers/walletMenu';
import AddLinks from 'components/addLinks';

const DefineProposal: React.FC = () => {
  const {t} = useTranslation();
  const {account, ensAvatarUrl}: useWalletProps = useWallet();

  return (
    <>
      <FormItem>
        <Label label={t('labels.author')} />

        <ButtonWallet
          label="You"
          src={ensAvatarUrl || account}
          isConnected
          disabled
        />
      </FormItem>

      <FormItem>
        <Label
          label={t('newWithdraw.defineProposal.title')}
          helpText={t('newWithdraw.defineProposal.titleHelptext')}
        />

        <TextInput
          placeholder={t('newWithdraw.defineProposal.titlePlaceholder')}
        />
      </FormItem>

      <FormItem>
        <Label
          label={t('newWithdraw.defineProposal.summary')}
          helpText={t('newWithdraw.defineProposal.summaryHelptext')}
        />
        <TextareaSimple
          placeholder={t('newWithdraw.defineProposal.summaryPlaceholder')}
        />
      </FormItem>

      <FormItem>
        <Label
          label={t('newWithdraw.defineProposal.proposal')}
          isOptional={true}
        />
        <TextareaWYSIWYG
          placeholder={t('newWithdraw.defineProposal.proposalPlaceholder')}
        />
      </FormItem>

      <FormItem>
        <Label
          label={t('labels.resources')}
          helpText={t('labels.resourcesHelptext')}
          isOptional
        />
        <AddLinks buttonPlusIcon />
      </FormItem>
    </>
  );
};

export default DefineProposal;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;
