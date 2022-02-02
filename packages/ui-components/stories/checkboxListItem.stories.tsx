import React, {useState} from 'react';
import {Meta, Story} from '@storybook/react';
import {CheckboxListItem, CheckboxListItemProps} from '../src';

export default {
  title: 'Components/Checkbox/ListItem',
  component: CheckboxListItem,
} as Meta;

const Template: Story<CheckboxListItemProps> = args => (
  <CheckboxListItem {...args} />
);

export const Default = Template.bind({});
Default.args = {
  label: 'Label',
  helptext: 'Helptext',
  multiSelect: true,
  disabled: false,
  state: 'default',
  onClick: console.log,
};

export const ListGroup = () => {
  const [selectedIndex, setIndex] = useState<number>(1);

  const handleOnClick = (index: number) => {
    if (index !== selectedIndex) setIndex(index);
  };

  return (
    <div className="space-y-1">
      <CheckboxListItem
        label="Label One"
        helptext="HelpText One"
        multiSelect={false}
        onClick={() => handleOnClick(1)}
        state={selectedIndex === 1 ? 'active' : 'default'}
      />
      <CheckboxListItem
        label="Label Two"
        helptext="HelpText Two"
        multiSelect={false}
        onClick={() => handleOnClick(2)}
        state={selectedIndex === 2 ? 'active' : 'default'}
      />
    </div>
  );
};
