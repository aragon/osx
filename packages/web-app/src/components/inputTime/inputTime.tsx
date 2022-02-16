import styled from 'styled-components';

/**
 * Temporary replacement for time input. Should be moved to replace the
 * time->input component in ui-components.
 *
 * TODO: Add necessary styles (like border color, etc.)
 */
export const SimplifiedTimeInput = styled.input.attrs({
  type: 'time',
  className: 'w-full rounded-xl border-2 border-ui-100 px-2 py-1.5',
})`
  // hides the icon that allows to open the time selection dropdown
  ::-webkit-calendar-picker-indicator {
    display: none;
  }
  ::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
    width: 101%; // necessary to make the "M" in AM/PM not be cropped
  }
  ::-webkit-datetime-edit-ampm-field {
    font-size: 12px;
    font-weight: bold;
  }
`;
