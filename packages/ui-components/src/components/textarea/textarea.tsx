import styled from 'styled-components';

export type TextareaSimpleProps = {
};

export const TextareaSimple = styled.textarea.attrs({
  className: `py-1.5 px-2 rounded-xl resize-none w-full border-2 border-ui-100 hover:border-ui-300 
    disabled:bg-ui-100 disabled:border-ui-200 focus:border-primary-500 bg-white text-ui-600`,
})`
  min-height: 144px;

  ::-webkit-input-placeholder {
    color: #9AA5B1;
  }
  ::-moz-placeholder {
    color: #9AA5B1;
  }
  :-ms-input-placeholder {
    color: #9AA5B1;
  }
  :-moz-placeholder {
    color: #9AA5B1;
  }
`;
