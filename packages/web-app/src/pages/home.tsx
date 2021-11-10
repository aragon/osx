import React, {useState} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Button} from '@aragon/ui-components';

import Wallet from 'components/wallet';
import BottomSheet from 'components/BottomSheet';

const Home: React.FC = () => {
  const {t} = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  function onClose() {
    setIsOpen(false);
  }

  function onOpen() {
    setIsOpen(true);
  }

  return (
    <div className="bg-white">
      <div className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 mx-auto max-w-screen-xl">
        <div className="text-center">
          <WelcomeMessage>{t('subtitle')}</WelcomeMessage>
          <Title>{t('title.part1')}</Title>
          <Subtitle>{t('title.part2')}</Subtitle>
        </div>
      </div>
      <h1>Wallet</h1>
      <Wallet />
      <Button onClick={onOpen} label="Toggle" />
      <BottomSheet onOpen={onOpen} isOpen={isOpen} onClose={onClose} />
    </div>
  );
};

const WelcomeMessage = styled.h2.attrs({
  className: 'text-base font-semibold tracking-wide text-blue-600 uppercase',
})``;
const Title = styled.p.attrs({
  className:
    'my-3 text-4xl sm:text-5xl lg:text-6xl font-bold sm:tracking-tight text-gray-900',
})``;
const Subtitle = styled.p.attrs({
  className:
    'my-3 text-4xl sm:text-5xl lg:text-6xl font-bold sm:tracking-tight text-gray-900',
})``;

export default Home;
