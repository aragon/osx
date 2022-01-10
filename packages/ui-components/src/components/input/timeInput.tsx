import React, {useMemo, useState} from 'react';
import styled from 'styled-components';
import {Radio, RadioGroup} from '../radioGroup';

export type valueType = {time: string; midday: 'pm' | 'am'};

export type TimeInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Changes a input's color schema */
  mode?: 'default' | 'success' | 'warning' | 'critical';
  disabled?: boolean;
  onChange: (value: valueType) => void;
  width?: number;
};

export const TimeInput: React.FC<TimeInputProps> = ({
  mode = 'default',
  disabled,
  width,
  onChange: onChangeCallback,
  ...props
}) => {
  const [time, setTime] = useState<valueType>({
    time: '',
    midday: 'pm',
  });

  useMemo(() => {
    if (onChangeCallback) {
      onChangeCallback(time);
    }
  }, [onChangeCallback, time]);

  const onChange = (
    nextValue: React.FormEvent<HTMLInputElement> | string,
    type: 'time' | 'midday'
  ) => {
    if (type === 'time') {
      const currentTarget = (nextValue as React.FormEvent<HTMLInputElement>)
        .target;
      setTime(prevState => ({
        time: (currentTarget as HTMLInputElement).value,
        midday: prevState.midday,
      }));
    } else {
      setTime(prevState => ({
        time: prevState.time,
        midday: nextValue as 'pm' | 'am',
      }));
    }
  };

  return (
    <Container data-testid="time-input" {...{mode, disabled, width}}>
      <StyledTimeInput
        {...props}
        disabled={disabled}
        onChange={e => onChange(e, 'time')}
        type={'time'}
        required
      />
      {/* TODO: This Radio button need to be customized. For now we used a
          default Radio button but it should update soon
      */}
      <RadioGroup defaultValue={'am'} onChange={e => onChange(e, 'midday')}>
        <Radio value="am">AM</Radio>
        <Radio value="pm">PM</Radio>
      </RadioGroup>
    </Container>
  );
};

export type StyledContainerProps = Pick<
  TimeInputProps,
  'mode' | 'disabled' | 'width'
>;

const Container = styled.div.attrs(
  ({mode, disabled, width}: StyledContainerProps) => {
    let className = `${
      disabled ? 'bg-ui-100' : 'bg-ui-0'
    } inline-flex p-1 bg-ui-0 ${
      width ? '' : 'w-30'
    } focus:outline-none items-center font-normal
      focus-within:ring-2 focus-within:ring-primary-500 justify-between
      rounded-xl hover:border-ui-300 border-2 active:border-primary-500 
    `;

    if (mode === 'default') {
      className += 'border-ui-100';
    } else if (mode === 'success') {
      className += 'border-success-600';
    } else if (mode === 'warning') {
      className += 'border-warning-600';
    } else if (mode === 'critical') {
      className += 'border-critical-600';
    }

    return {
      className,
      ...(width && {style: {width: `${width}px`}}),
    };
  }
)<StyledContainerProps>``;

const StyledTimeInput = styled.input.attrs(({disabled}) => {
  const className: string | undefined = `${
    disabled ? 'text-ui-300' : 'text-ui-600'
  } bg-transparent focus:outline-none margin-0 w-full`;

  return {
    className,
  };
})`
  ::-webkit-calendar-picker-indicator {
    display: none;
  }
  ::-webkit-datetime-edit-ampm-field {
    display: none;
  }
`;
