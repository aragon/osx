import React from 'react';
import styled from 'styled-components';
import {ButtonText, CheckboxSimple} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext} from 'react-hook-form';

import {useFormStep} from 'components/fullScreenStepper';

const Blockchain: React.FC = () => {
  const {control, getValues} = useFormContext();
  const {setStep} = useFormStep();
  const {blockchain} = getValues();
  const {t} = useTranslation();

  return (
    <Card>
      <Header>
        <Title>{t('labels.review.blockchain')}</Title>
      </Header>
      <Body>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.review.network')}</Label>
          </LabelWrapper>
          <TextContent>
            {t('createDAO.review.network', {network: blockchain.network})}
          </TextContent>
        </Row>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.review.blockchain')}</Label>
          </LabelWrapper>
          <TextContent>{blockchain.label}</TextContent>
        </Row>
      </Body>
      <Footer>
        <ActionWrapper>
          <ButtonText label="Edit" mode="ghost" onClick={() => setStep(2)} />
        </ActionWrapper>
        <Controller
          name="reviewCheck.blockchain"
          control={control}
          defaultValue={false}
          rules={{
            required: t('errors.required.recipient'),
          }}
          render={({field: {onChange, value}}) => (
            <CheckboxSimple
              state={value ? 'active' : 'default'}
              label="These values are correct"
              onClick={() => onChange(!value)}
              multiSelect
            />
          )}
        />
      </Footer>
    </Card>
  );
};

export default Blockchain;

export const Card = styled.div.attrs({
  className: 'bg-ui-0 rounded-xl p-3 w-full mb-5',
})``;

export const Header = styled.div.attrs({
  className: 'flex pb-3',
})``;

export const Title = styled.h2.attrs({
  className: 'font-bold text-lg',
})``;

export const Body = styled.div.attrs({
  className: 'pb-1',
})``;

export const Row = styled.div.attrs({
  className: 'block tablet:flex mb-2 w-full',
})``;

export const Label = styled.h3.attrs({
  className: 'text-ui-800 font-bold pb-0.5 tablet:pb-0',
})``;

export const LabelWrapper = styled.div.attrs({
  className: 'w-full tablet:w-3/12',
})``;

export const TextContent = styled.span.attrs({
  className: 'text-base text-ui-500 font-normal capitalize',
})``;

export const Footer = styled.div.attrs({
  className:
    'flex flex-row-reverse tablet:flex-row justify-between tablet:justify-start',
})``;

export const ActionWrapper = styled.div.attrs({
  className: 'order-first tablet:md:order-last w-fit tablet:w-3/12',
})``;
