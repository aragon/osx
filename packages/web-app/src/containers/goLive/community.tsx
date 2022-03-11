import React from 'react';
import styled from 'styled-components';
import {ButtonText, CheckboxSimple, Link, Badge} from '@aragon/ui-components';
import {Controller, useFormContext} from 'react-hook-form';
import {useTranslation} from 'react-i18next';

import {useFormStep} from 'components/fullScreenStepper';

import {
  Card,
  Header,
  Title,
  Body,
  Row,
  Label,
  LabelWrapper,
  TextContent,
  Footer,
  ActionWrapper,
} from './blockchain';

const Community: React.FC = () => {
  const {control, getValues} = useFormContext();
  const {setStep} = useFormStep();
  const {t} = useTranslation();
  const {
    membership,
    tokenName,
    wallets,
    isCustomToken,
    tokenSymbol,
    tokenTotalSupply,
  } = getValues();

  return (
    <Card>
      <Header>
        <Title>{t('labels.review.community')}</Title>
      </Header>
      <Body>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.review.eligibleMembers')}</Label>
          </LabelWrapper>
          <TextContent>
            {membership === 'token' ? t('createDAO.step3.tokenMembership') : ''}
          </TextContent>
        </Row>
        <Row>
          <LabelWrapper>
            <Label>{t('votingTerminal.token')}</Label>
          </LabelWrapper>
          <BadgeWrapper>
            <TextContent>
              {tokenName}&nbsp;&nbsp;{tokenSymbol}
            </TextContent>
            {isCustomToken && <Badge label="New" colorScheme="info" />}
          </BadgeWrapper>
        </Row>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.supply')}</Label>
          </LabelWrapper>
          <BadgeWrapper>
            <TextContent>
              {tokenTotalSupply} {tokenSymbol}
            </TextContent>
            <Badge label="Fixed" colorScheme="neutral" />
          </BadgeWrapper>
        </Row>
        {isCustomToken && (
          <Row>
            <LabelWrapper>
              <Label>{t('labels.review.distribution')}</Label>
            </LabelWrapper>
            <Link
              label={t('createDAO.review.distributionLink', {
                count: wallets?.length,
              })}
            />
          </Row>
        )}
      </Body>
      <Footer>
        <ActionWrapper>
          <ButtonText label="Edit" mode="ghost" onClick={() => setStep(4)} />
        </ActionWrapper>
        <Controller
          name="reviewCheck.community"
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

export default Community;

const BadgeWrapper = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;
