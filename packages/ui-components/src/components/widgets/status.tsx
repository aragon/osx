import React from 'react';
import styled from 'styled-components';

import {ProgressStatus, ProgressStatusProps} from '../progress/status';

export type WidgetStatusProps = {
  /**
   * The widget status displays the status of a process. Such an process
   * typically consists of a number of steps. Each of these steps has a set of
   * attributes (see `ProgressStatusProps`). These attributes must be passed as
   * an array of objects.
   */
  steps: ProgressStatusProps[];
};

export const WidgetStatus: React.FC<WidgetStatusProps> = ({steps}) => {
  return (
    <Card data-testid="widgetStatus">
      <Header>Status</Header>
      {steps.length > 0 ? (
        steps.map(s => {
          return <ProgressStatus key={s.label + s.mode} {...s} />;
        })
      ) : (
        <p className="text-ui-400">Progress unavailable</p>
      )}
    </Card>
  );
};

const Card = styled.div.attrs(() => {
  const baseClasses = 'bg-ui-0 rounded-xl pt-3 pb-4 space-y-3';
  const bpClasses = ' px-2  tablet:px-3';
  return {className: baseClasses + bpClasses};
})``;

const Header = styled.p.attrs({className: 'font-bold ft-text-xl'})``;
