import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ActionListItem} from '../src/components/actionListItem';
import {
  Dropdown,
  DropdownProps,
  ListItemProps,
} from '../src/components/dropdown';
import {ButtonText, ButtonIcon} from '../src/components/button/';
import {IconChevronRight, IconMenuVertical} from '../src/components/icons';

export default {
  title: 'Components/Dropdown',
  component: Dropdown,
} as Meta;

const Template: Story<DropdownProps> = args => (
  <div className={'flex justify-center items-center h-96'}>
    <div>
      <Dropdown {...args} />
    </div>
  </div>
);

const items: ListItemProps[] = [
  {
    component: (
      <ActionListItem icon={<IconChevronRight />} title="first item" />
    ),
    callback: () => {
      alert('first item selected');
    },
  },
  {
    component: (
      <ActionListItem icon={<IconChevronRight />} title="second item" />
    ),
    callback: () => {
      alert('second item selected');
    },
  },
];

export const Default = Template.bind({});
Default.args = {
  side: 'bottom',
  trigger: <ButtonText label="Trigger" mode="primary" />,
  listItems: items,
};

export const MenuButtonWithIcon = Template.bind({});
MenuButtonWithIcon.args = {
  side: 'bottom',
  trigger: <ButtonIcon mode="secondary" icon={<IconMenuVertical />} />,
  listItems: items,
};
