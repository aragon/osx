import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {ButtonText, IconAdd} from '@aragon/ui-components';
import {useFormContext, useFieldArray} from 'react-hook-form';

import Row from './row';
import Header from './header';

export type AddLinks = {
  buttonPlusIcon?: boolean;
  buttonLabel?: string;
};

const AddLinks: React.FC<AddLinks> = ({buttonPlusIcon, buttonLabel}) => {
  const {t} = useTranslation();
  const {control} = useFormContext();
  const {fields, append, remove} = useFieldArray({name: 'links', control});

  // TODO: research focus after input refactor
  const handleAddLink = () => {
    append({label: '', link: ''});
  };

  return (
    <Container data-testid="add-links">
      {fields.length > 0 && (
        <ListGroup>
          <Header />
          {fields.map((field, index) => (
            <Row key={field.id} index={index} onDelete={() => remove(index)} />
          ))}
        </ListGroup>
      )}
      <ButtonText
        label={buttonLabel || t('labels.addLink')}
        mode="secondary"
        size="large"
        onClick={handleAddLink}
        {...(buttonPlusIcon ? {iconLeft: <IconAdd />} : {})}
      />
    </Container>
  );
};

export default AddLinks;

const Container = styled.div.attrs({className: 'space-y-1.5'})``;
const ListGroup = styled.div.attrs({
  className: 'flex flex-col overflow-hidden space-y-0.25 rounded-xl',
})``;
