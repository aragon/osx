import React from 'react';
import {CardDao} from '@aragon/ui-components';

import NavLinks from 'components/navLinks';
import BottomSheet from 'components/bottomSheet';

type MobileNavMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MobileNavMenu: React.FC<MobileNavMenuProps> = props => {
  return (
    <BottomSheet isOpen={props.isOpen} onClose={props.onClose}>
      {/* TODO: add shadow for card dao */}
      <div className="tablet:w-50">
        <CardDao
          daoAddress="dao-name.dao.eth"
          daoName="DAO Name"
          onClick={() => null}
          src=""
        />
        <div className="py-3 px-2 space-y-3">
          <NavLinks parent="modal" onItemClick={props.onClose} />
        </div>
      </div>
    </BottomSheet>
  );
};

export default MobileNavMenu;
