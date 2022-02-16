import {AlertInline} from '@aragon/ui-components';
import React, {useEffect, useState} from 'react';
import {useFormContext, FieldError} from 'react-hook-form';

type DateTimeErrorsProps = {
  mode: 'start' | 'end';
};

export function DateTimeErrors({mode}: DateTimeErrorsProps) {
  const {formState} = useFormContext();

  const [requiredErrors, setRequiredErrors] = useState<string[]>([]);
  const [validatedErrors, setValidatedErrors] = useState<string[]>([]);

  useEffect(() => {
    const reqErrors: string[] = [];
    const valErrors: string[] = [];

    // filter for errors that target the current mode
    const fieldErrors: FieldError[] = Object.values(formState.errors);
    const modeSpecificErrors = fieldErrors.filter(e =>
      e.ref?.name.includes(mode)
    );
    // categorize them by error type
    modeSpecificErrors.forEach(e => {
      if (!e.message) return;

      switch (e.type) {
        case 'required':
          reqErrors.push(e.message);
          break;
        case 'validate':
          valErrors.push(e.message);
          break;
        default:
          break;
      }
    });

    setRequiredErrors(reqErrors);
    setValidatedErrors(valErrors);
  }, [formState]); //eslint-disable-line

  if (requiredErrors.length > 0) {
    return (
      <div>
        {requiredErrors.map((msg, i) => (
          <AlertInline key={i} label={msg} mode="critical" />
        ))}
      </div>
    );
  }

  if (validatedErrors.length > 0) {
    return (
      <div>
        <AlertInline label={validatedErrors[0]} mode="critical" />
      </div>
    );
  }

  return null;
}
