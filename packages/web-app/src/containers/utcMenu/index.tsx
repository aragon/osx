import React, {useState} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {
  IconChevronRight,
  ListItemText,
  SearchInput,
} from '@aragon/ui-components';

import {useGlobalModalContext} from 'context/globalModals';
import {timezones} from './utcData';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';

const UtcMenu: React.FC = () => {
  const {isUtcOpen, close} = useGlobalModalContext();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const {t} = useTranslation();

  const handleUtcClick = () => {
    close('utc');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredTimezones = timezones.filter(tz => {
    const lowerCaseTz = tz.toLocaleLowerCase();
    const lowercaseTerm = searchTerm.toLocaleLowerCase();
    return lowerCaseTz.includes(lowercaseTerm);
  });

  return (
    <ModalBottomSheetSwitcher
      isOpen={isUtcOpen}
      onClose={() => close('utc')}
      title={t('newWithdraw.configureWithdraw.utcMenu.title') as string}
    >
      <ModalBody>
        <SearchInput
          placeholder="Type to filter"
          value={searchTerm}
          onChange={handleChange}
        />
        <Container>
          <ScrollableDiv>
            {filteredTimezones.map((tz: string) => {
              return (
                <ListItemText
                  mode="default"
                  key={tz}
                  title={tz}
                  iconRight={<IconChevronRight />}
                  onClick={() => handleUtcClick()}
                />
              );
            })}
          </ScrollableDiv>
        </Container>
      </ModalBody>
    </ModalBottomSheetSwitcher>
  );
};

export default UtcMenu;

const ModalBody = styled.div.attrs({className: 'space-y-1 p-3'})``;

const Container = styled.div.attrs({
  className: 'space-y-1 overflow-y-auto',
})``;
const ScrollableDiv = styled.div.attrs({
  className: 'h-25 space-y-1 p-1',
})``;
