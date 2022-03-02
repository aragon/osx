import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {CheckboxListItem, Label} from '@aragon/ui-components';
import {Controller, useFormContext, useWatch} from 'react-hook-form';

import ExistingTokenPartialForm from './addExistingToken';
import CreateNewToken from './createNewToken';

const SetupCommunityForm: React.FC = () => {
  const {t} = useTranslation();
  const {control, resetField, setValue} = useFormContext();
  const isCustomToken = useWatch({name: 'isCustomToken'});

  const resetTokenFields = () => {
    resetField('tokenName');
    resetField('tokenSymbol');
    resetField('tokenTotalSupply');
    setValue('wallets', [
      {address: 'DAO Treasury', amount: '0'},
      {address: 'My Wallet', amount: '0'},
    ]);
  };

  return (
    <>
      {/* Eligibility */}
      <FormItem>
        <Label label={t('labels.membership')} />
        <Controller
          name="membership"
          control={control}
          defaultValue="token"
          render={({field: {onChange, value}}) => (
            <CheckboxListItem
              label={t('createDAO.step3.tokenMembership')}
              helptext={t('createDAO.step3.tokenMembershipSubtitle')}
              multiSelect={false}
              onClick={() => onChange('token')}
              {...(value === 'token' ? {state: 'active'} : {})}
            />
          )}
        />

        <CheckboxListItem
          label={t('createDAO.step3.walletMemberShip')}
          helptext={t('createDAO.step3.walletMemberShipSubtitle')}
          disabled
          onClick={() => null}
          multiSelect={false}
        />
      </FormItem>

      {/* Token creation */}
      {/* TODO: when validating, the two list items should be either wrapped in a component that takes care of the state
        or manually call setValue() onChange and get rid of the controller so that required validation can be done
      */}
      <FormItem>
        <Label label={t('labels.communityToken')} />
        <Controller
          name="isCustomToken"
          defaultValue={null}
          control={control}
          render={({field: {onChange, value}}) => (
            <CheckboxListItem
              label={t('createDAO.step3.newToken')}
              helptext={t('createDAO.step3.newTokenSubtitle')}
              multiSelect={false}
              onClick={() => {
                resetTokenFields();
                onChange(true);
              }}
              state={value ? 'active' : 'default'}
            />
          )}
        />
        <Controller
          control={control}
          name="isCustomToken"
          defaultValue={null}
          render={({field: {onChange, value}}) => (
            <CheckboxListItem
              label={t('createDAO.step3.existingToken')}
              helptext={t('createDAO.step3.existingTokenSubtitle')}
              state={value === false ? 'active' : 'default'}
              multiSelect={false}
              onClick={() => {
                onChange(false);
                resetTokenFields();
              }}
            />
          )}
        />
      </FormItem>

      {/* Add existing token */}

      {isCustomToken === true && <CreateNewToken />}

      {isCustomToken === false && (
        <ExistingTokenPartialForm {...{resetTokenFields}} />
      )}
    </>
  );
};

export default SetupCommunityForm;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;
