import React from 'react';
import {Meta, Story} from '@storybook/react';
import {ProgressStatusProps, WidgetStatus, WidgetStatusProps} from '../src';

export default {
  title: 'Components/Widget/Status',
  component: WidgetStatus,
} as Meta;

const Template: Story<WidgetStatusProps> = args => (
  <div className="tablet:w-1/2 desktop:w-1/3">
    <WidgetStatus {...args} />
  </div>
);

/* MOCK DATA ================================================================ */

const stepDataPublished: ProgressStatusProps[] = [
  {
    label: 'Published',
    mode: 'upcoming',
  },
];

const publishedDone: ProgressStatusProps = {
  label: 'Published',
  mode: 'done',
  date: '2021/11/16 4:30 PM UTC+2',
  block: '132,123,231',
};

const stepDataRunning: ProgressStatusProps[] = [
  publishedDone,
  {
    label: 'Running',
    date: '2021/11/16 4:30 PM UTC+2',
    mode: 'active',
  },
];

const runningDone: ProgressStatusProps = {
  label: 'Running',
  date: '2021/11/16 4:30 PM UTC+2',
  mode: 'done',
};

const stepDataDeclined: ProgressStatusProps[] = [
  publishedDone,
  runningDone,
  {
    label: 'Declined',
    date: '2021/11/16 4:30 PM UTC+2',
    mode: 'failed',
  },
];

const stepDataReady: ProgressStatusProps[] = [
  publishedDone,
  runningDone,
  {
    label: 'Suceeded',
    date: '2021/11/16 4:30 PM UTC+2',
    mode: 'done',
  },
  {
    label: 'Execution',
    date: '2021/11/16 4:30 PM UTC+2',
    mode: 'upcoming',
    block: '132,123,231',
  },
];

const stepDataExecuted: ProgressStatusProps[] = [
  publishedDone,
  runningDone,
  {
    label: 'Suceeded',
    date: '2021/11/16 4:30 PM UTC+2',
    mode: 'done',
  },
  {
    label: 'Execution',
    date: '2021/11/16 4:30 PM UTC+2',
    mode: 'succeeded',
    block: '132,123,231',
  },
];

/* STORIES ================================================================== */

export const Published = Template.bind({});
Published.args = {
  steps: stepDataPublished,
};

export const Running = Template.bind({});
Running.args = {
  steps: stepDataRunning,
};

export const Declined = Template.bind({});
Declined.args = {
  steps: stepDataDeclined,
};

export const Ready = Template.bind({});
Ready.args = {
  steps: stepDataReady,
};

export const Executed = Template.bind({});
Executed.args = {
  steps: stepDataExecuted,
};

export const Empty = Template.bind({});
Empty.args = {
  steps: [],
};
