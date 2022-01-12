import React, {useCallback} from 'react';
import {useEditor, EditorContent, Editor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import styled from 'styled-components';
import {ButtonIcon} from '../button';
import {
  IconBold,
  IconExpand,
  IconItalic,
  IconLinkSet,
  IconLinkUnset,
  IconListOrdered,
  IconListUnordered,
} from '../icons';

type MenuBarProps = {
  disabled: boolean;
  editor: Editor | null;
};

const MenuBar: React.FC<MenuBarProps> = ({editor, disabled}) => {
  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({href: url}).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <StyledMenuBar disabled={disabled}>
      <Toolgroup>
        <ButtonIcon
          icon={<IconBold />}
          mode="ghost"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
        />
        <ButtonIcon
          icon={<IconItalic />}
          mode="ghost"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
        />
        <ButtonIcon
          icon={<IconLinkSet />}
          mode="ghost"
          isActive={editor.isActive('link')}
          onClick={setLink}
          disabled={disabled}
        />
        <ButtonIcon
          icon={<IconLinkUnset />}
          mode="ghost"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link') || disabled}
        />
        <ButtonIcon
          icon={<IconListOrdered />}
          mode="ghost"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
        />
        <ButtonIcon
          icon={<IconListUnordered />}
          mode="ghost"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
        />
      </Toolgroup>
      {/* TODO: This button is dummy for now */}
      <ButtonIcon icon={<IconExpand />} mode="ghost" disabled={disabled} />
    </StyledMenuBar>
  );
};

export type TextareaWYSIWYGProps = {
  placeholder: string;
  disabled?: boolean;
};

export const TextareaWYSIWYG: React.FC<TextareaWYSIWYGProps> = ({
  placeholder,
  disabled = false,
}) => {
  const editor = useEditor(
    {
      editable: !disabled,
      extensions: [
        StarterKit,
        Link,
        Placeholder.configure({
          placeholder,
        }),
      ],
    },
    [disabled]
  );

  return (
    <Container disabled={disabled}>
      <MenuBar disabled={disabled} editor={editor} />
      <StyledEditorContent editor={editor} />
    </Container>
  );
};

type Props = {
  disabled: boolean;
};

const Container = styled.div.attrs(({disabled}: Props) => ({
  className: `rounded-xl w-full border-2 border-ui-100 hover:border-ui-300 text-ui-600 ${
    disabled ? 'bg-ui-100 border-ui-200' : 'bg-white'
  }`,
}))<Props>`
  :focus-within {
    border-color: #003bf5;
  }

  :focus-within[disabled] {
    border-color: #cbd2d9;
  }

  ::-webkit-input-placeholder {
    color: #9aa5b1;
  }
  ::-moz-placeholder {
    color: #9aa5b1;
  }
  :-ms-input-placeholder {
    color: #9aa5b1;
  }
  :-moz-placeholder {
    color: #9aa5b1;
  }
`;

const StyledMenuBar = styled.div.attrs(({disabled}: Props) => ({
  className: `rounded-t-xl bg-ui-50 px-2 py-1.5 flex justify-between ${
    disabled && 'bg-ui-100'
  }`,
}))<Props>``;

const Toolgroup = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const StyledEditorContent = styled(EditorContent)`
  .ProseMirror {
    padding: 12px 16px;
    min-height: 112px;

    :focus {
      outline: none;
    }

    ul {
      list-style-type: decimal;
      padding: 0 1rem;
    }

    ol {
      list-style-type: disc;
      padding: 0 1rem;
    }

    a {
      color: #003bf5;
      cursor: pointer;
      font-weight: 700;

      :hover {
        color: #0031ad;
      }
    }
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;
