import {
  AlertInline,
  ButtonIcon,
  IconMenuVertical,
  Label,
  ListItemText,
  Popover,
  TextInput,
} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Control, Controller, FieldValues} from 'react-hook-form';

type LinkRowProps = {
  control: Control<FieldValues, object>;
  index: number;
  onDelete?: (index: number) => void;
};

const LinkRow: React.FC<LinkRowProps> = ({control, index, onDelete}) => {
  const {t} = useTranslation();

  return (
    <Container data-testid="link-row">
      <LabelContainer>
        <Controller
          name={`links.${index}.label`}
          control={control}
          render={({field, fieldState: {error}}) => (
            <>
              <LabelWrapper>
                <Label label={t('labels.label')} />
              </LabelWrapper>
              <TextInput
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                mode={error?.message ? 'critical' : 'default'}
              />
              {error?.message && (
                <ErrorContainer>
                  <AlertInline label={error.message} mode="critical" />
                </ErrorContainer>
              )}
            </>
          )}
        />
      </LabelContainer>

      <LinkContainer>
        <Popover
          side="bottom"
          align="end"
          width={156}
          content={
            <div className="p-1.5">
              <ListItemText
                title={t('labels.removeLink')}
                {...(typeof onDelete === 'function'
                  ? {mode: 'default', onClick: () => onDelete(index)}
                  : {mode: 'disabled'})}
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
      </LinkContainer>

      <Break />

      <ButtonWrapper>
        <Controller
          name={`links.${index}.link`}
          control={control}
          render={({field, fieldState: {error}}) => (
            <>
              <LabelWrapper>
                <Label label={t('labels.link')} />
              </LabelWrapper>

              <TextInput
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                placeholder="https://"
                mode={error?.message ? 'critical' : 'default'}
              />
              {error?.message && (
                <ErrorContainer>
                  <AlertInline label={error.message} mode="critical" />
                </ErrorContainer>
              )}
            </>
          )}
        />
      </ButtonWrapper>
    </Container>
  );
};

export default LinkRow;

const Container = styled.div.attrs({
  className: 'flex flex-wrap gap-x-2 gap-y-1.5 p-2 bg-ui-0',
})``;

const LabelContainer = styled.div.attrs({
  className: 'flex-1 tablet:order-1 h-full',
})``;

const LabelWrapper = styled.div.attrs({
  className: 'tablet:hidden mb-0.5',
})``;

const LinkContainer = styled.div.attrs({
  className: 'tablet:order-3 pt-3.5 tablet:pt-0',
})``;

const ErrorContainer = styled.div.attrs({
  className: 'mt-0.5',
})``;

const Break = styled.hr.attrs({className: 'tablet:hidden w-full border-0'})``;

const ButtonWrapper = styled.div.attrs({
  className: 'flex-1 tablet:order-2 h-full',
})``;
