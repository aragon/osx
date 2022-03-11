import React from 'react';
import styled from 'styled-components';
import {
  ButtonText,
  Popover,
  ListItemAction,
  IconMenuVertical,
  ButtonIcon,
} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {useFormContext, useFieldArray} from 'react-hook-form';

import Row from './row';
import Header from './header';
import Footer from './footer';

const AddWallets: React.FC = () => {
  const {t} = useTranslation();
  const {control, watch, setValue, resetField, trigger} = useFormContext();
  const watchFieldArray = watch('wallets');
  const {fields, append, remove} = useFieldArray({name: 'wallets', control});

  const controlledFields = fields.map((field, index) => {
    return {
      ...field,
      ...(watchFieldArray && {...watchFieldArray[index]}),
    };
  });

  const resetDistribution = () => {
    controlledFields.forEach((_, index) => {
      setValue(`wallets.${index}.amount`, '0');
    });
    resetField('tokenTotalSupply');
  };

  // setTimeout added because instant trigger not working
  const handleAddWallet = () => {
    append({address: '', amount: '0'});
    setTimeout(() => {
      trigger(`wallets.${controlledFields.length}.address`);
    }, 50);
  };

  return (
    <Container data-testid="add-wallets">
      <ListGroup>
        <Header />
        {controlledFields.map((field, index) => {
          return (
            <Row
              key={field.id}
              index={index}
              {...(index !== 0 ? {onDelete: () => remove(index)} : {})}
            />
          );
        })}
        <Footer totalAddresses={fields.length || 0} />
      </ListGroup>
      <ActionsWrapper>
        <ButtonText
          label={t('labels.addWallet') as string}
          mode="secondary"
          size="large"
          onClick={handleAddWallet}
        />
        <Popover
          side="bottom"
          align="end"
          width={264}
          content={
            <div className="p-1.5 space-y-0.5">
              <ListItemAction
                title={t('labels.resetDistribution')}
                onClick={resetDistribution}
                bgWhite
              />
              <ListItemAction
                title={t('labels.deleteAllAddresses')}
                onClick={() => {
                  remove();
                  append([{address: 'DAO Treasury', amount: '0'}]);
                  resetField('tokenTotalSupply');
                }}
                bgWhite
              />
            </div>
          }
        >
          <ButtonIcon
            mode="ghost"
            size="large"
            bgWhite
            icon={<IconMenuVertical />}
            data-testid="trigger"
          />
        </Popover>
      </ActionsWrapper>
    </Container>
  );
};

export default AddWallets;

const Container = styled.div.attrs({className: 'space-y-1.5'})``;

const ListGroup = styled.div.attrs({
  className: 'flex flex-col overflow-hidden space-y-0.25 rounded-xl',
})``;

const ActionsWrapper = styled.div.attrs({
  className: 'flex justify-between',
})``;
