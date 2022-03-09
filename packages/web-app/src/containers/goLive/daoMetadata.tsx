import React from 'react';
import styled from 'styled-components';
import {
  ButtonText,
  CheckboxSimple,
  AvatarDao,
  ListItemLink,
} from '@aragon/ui-components';
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

const DaoMetadata: React.FC = () => {
  const {control, getValues} = useFormContext();
  const {setStep} = useFormStep();
  const {t} = useTranslation();
  const {daoLogo, daoName, daoSummary, links} = getValues();

  return (
    <Card>
      <Header>
        <Title>{t('labels.review.daoMetadata')}</Title>
      </Header>
      <Body>
        <LogoRow>
          <LabelWrapper>
            <Label>{t('labels.logo')}</Label>
          </LabelWrapper>
          <AvatarDao
            {...{daoName}}
            {...(daoLogo && {src: URL.createObjectURL(daoLogo)})}
          />
        </LogoRow>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.daoName')}</Label>
          </LabelWrapper>
          <TextContent>{daoName}</TextContent>
        </Row>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.description')}</Label>
          </LabelWrapper>
          <DescriptionContent>{daoSummary}</DescriptionContent>
        </Row>
        {links[0].href !== '' && (
          <Row>
            <LabelWrapper>
              <Label>{t('labels.links')}</Label>
            </LabelWrapper>
            <ContentWrapper>
              {links.map(
                (
                  {label, href}: {label: string; href: string},
                  index: number
                ) => {
                  return (
                    href !== '' && (
                      <ListItemLink key={index} {...{label, href}} external />
                    )
                  );
                }
              )}
            </ContentWrapper>
          </Row>
        )}
      </Body>
      <Footer>
        <ActionWrapper>
          <ButtonText label="Edit" mode="ghost" onClick={() => setStep(3)} />
        </ActionWrapper>
        <Controller
          name="reviewCheck.daoMetadata"
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

const ContentWrapper = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const DescriptionContent = styled.p.attrs({
  className: 'w-9/12',
})``;

const LogoRow = styled.div.attrs({
  className: 'block tablet:flex tablet:items-center mb-2 w-full',
})``;

export default DaoMetadata;
