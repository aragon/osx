import React from 'react';
import {AlertInline, ButtonText, IconAdd, Label} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components';

import {useGlobalModalContext} from 'context/globalModals';
import {useActionsContext} from 'context/actions';
import ActionBuilder from 'containers/actionBuilder';

const ConfigureActions: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useGlobalModalContext();
  const {actions} = useActionsContext();

  return (
    <>
      {actions.length !== 0 ? (
        <ActionsWrapper>
          <ActionBuilder />
          <ButtonText
            mode="ghost"
            size="large"
            bgWhite
            label={t('newProposal.configureActions.addAction')}
            iconLeft={<IconAdd />}
            onClick={() => open('addAction')}
            className="mt-2"
          />
        </ActionsWrapper>
      ) : (
        <FormItem>
          <Label
            label={t('newProposal.configureActions.yesOption')}
            helpText={t('newProposal.configureActions.yesOptionSubtitle')}
          />
          <div className="flex flex-col items-center p-6 text-center bg-ui-0 rounded-xl">
            <h1 className="font-bold text-ui-800">
              {t('newProposal.configureActions.addFirstActionTitle')}
            </h1>
            <p className="mt-0.5 text-sm text-ui-600">
              {t('newProposal.configureActions.addFirstActionSubtitle')}
            </p>
            <ButtonText
              mode="secondary"
              size="large"
              bgWhite
              label={t('newProposal.configureActions.addFirstAction')}
              iconLeft={<IconAdd />}
              onClick={() => open('addAction')}
              className="mt-3"
            />
          </div>
          <AlertInline label={t('newProposal.configureActions.actionsInfo')} />
        </FormItem>
      )}
    </>
  );
};

export default ConfigureActions;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const ActionsWrapper = styled.div.attrs({
  className: 'space-y-2',
})``;
