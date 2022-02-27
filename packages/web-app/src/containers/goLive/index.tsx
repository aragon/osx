import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {useFormContext} from 'react-hook-form';
import {ButtonText, IconChevronRight} from '@aragon/ui-components';

import {useFormStep} from 'components/fullScreenStepper';
import Blockchain from './blockchain';
import DaoMetadata from './daoMetadata';
import Community from './community';
import Governance from './governance';
import goLive from 'public/goLive.svg';

export const GoLiveHeader: React.FC = () => {
  const {t} = useTranslation();

  return (
    <div className="flex justify-between px-2 tablet:px-6 bg-ui-0 rounded-xl">
      <div className="py-6 w-full">
        <h1 className="text-3xl font-bold text-ui-800">
          {t('createDAO.review.title')}
        </h1>
        <p className="mt-2 text-lg text-ui-600">
          {t('createDAO.review.description')}
        </p>
      </div>
      <ImageContainer src={goLive} />
    </div>
  );
};

const GoLive: React.FC = () => {
  return (
    <Container>
      <Blockchain />
      <DaoMetadata />
      <Community />
      <Governance />
    </Container>
  );
};

export const GoLiveFooter: React.FC = () => {
  const {next} = useFormStep();
  const {watch} = useFormContext();
  const {reviewCheck} = watch();
  const {t} = useTranslation();

  const IsButtonDisabled = () =>
    !Object.values(reviewCheck).every(v => v === true);

  return (
    <div className="flex justify-center pt-3">
      <ButtonText
        size="large"
        iconRight={<IconChevronRight />}
        label={t('createDAO.review.button')}
        onClick={next}
        disabled={IsButtonDisabled()}
      />
    </div>
  );
};

export default GoLive;

const Container = styled.div.attrs({
  className: 'tablet:mx-auto tablet:w-3/4',
})``;

const ImageContainer = styled.img.attrs({
  className: 'w-25 hidden tablet:block',
})``;
