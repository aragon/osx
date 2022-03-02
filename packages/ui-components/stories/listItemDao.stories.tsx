import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ListItemDao, ListItemDaoProps} from '../src/components/listItem';
import {useState} from '@storybook/addons';

export default {
  title: 'Components/ListItem/Dao',
  component: ListItemDao,
} as Meta;

const Template: Story<{daos: ListItemDaoProps[]}> = args => {
  const [selected, setSelected] = useState(args.daos[1].daoName);

  return (
    <div className="space-y-2">
      <p>Selected item: {selected}</p>
      {args.daos.map((dao, index) => (
        <ListItemDao
          key={index}
          {...dao}
          selected={selected === dao.daoName}
          onClick={() => setSelected(dao.daoName)}
        />
      ))}
    </div>
  );
};

export const Dao = Template.bind({});
Dao.args = {
  daos: [
    {
      daoName: 'Bushido DAO',
      daoAddress: 'bushido.dao.eth',
    },
    {
      daoName: 'Patito DAO',
      daoAddress: 'patito.dao.eth',
    },
  ],
};
