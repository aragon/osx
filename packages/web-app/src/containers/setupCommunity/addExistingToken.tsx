import {
  AlertInline,
  Label,
  Link,
  SearchInput,
  TextInput,
} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext} from 'react-hook-form';

const AddExistingToken: React.FC = () => {
  const {t} = useTranslation();
  const {control} = useFormContext();

  return (
    <>
      <DescriptionContainer>
        <Title>{t('labels.addExistingToken')}</Title>
        <Subtitle>
          {t('createDAO.step3.addExistingTokenHelptext')}
          <Link label={t('createDAO.step3.tokenHelptextLink')} href="" />.
        </Subtitle>
      </DescriptionContainer>
      <FormItem>
        <DescriptionContainer>
          <Label label={t('labels.address')} />
          <p>
            <span>{t('createDAO.step3.tokenContractSubtitlePart1')}</span>
            <Link label="block explorer" href="#" />
            {'. '}
            <span>{t('createDAO.step3.tokenContractSubtitlePart2')}</span>
          </p>
        </DescriptionContainer>
        <Controller
          name="tokenAddress"
          control={control}
          defaultValue=""
          render={({field, fieldState: {error, invalid, isDirty}}) => (
            <>
              <SearchInput {...field} placeholder="0x..." />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
              {!invalid && isDirty && (
                <AlertInline label={t('success.contract')} mode="success" />
              )}
            </>
          )}
        />
        <TokenInfoContainer>
          <InfoContainer>
            <Label label={t('labels.existingTokenName')} />
            <TextInput disabled value="Aragon" />
          </InfoContainer>
          <InfoContainer>
            <Label label={t('labels.existingTokenSymbol')} />
            <TextInput disabled value="ANT" />
          </InfoContainer>
          <InfoContainer>
            <Label label={t('labels.existingTokenSupply')} />
            <TextInput disabled value="43,028,631" />
          </InfoContainer>
        </TokenInfoContainer>
      </FormItem>
    </>
  );
};

export default AddExistingToken;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const DescriptionContainer = styled.div.attrs({
  className: 'space-y-0.5',
})``;

const Title = styled.p.attrs({className: 'text-lg font-bold text-ui-800'})``;

const Subtitle = styled.p.attrs({className: 'text-ui-600 text-bold'})``;

const TokenInfoContainer = styled.div.attrs({
  className:
    'flex justify-between items-center p-2 space-x-2 bg-ui-0 rounded-xl',
})``;

const InfoContainer = styled.div.attrs({
  className: 'space-y-1',
})``;
