import React, {useCallback, useState} from 'react';
import ReactDOM from 'react-dom';
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
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  fullScreen?: boolean;
};

const MenuBar: React.FC<MenuBarProps> = ({
  editor,
  disabled,
  isExpanded,
  setIsExpanded,
  fullScreen = false,
}) => {
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
    <StyledMenuBar disabled={disabled} fullScreen={fullScreen}>
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
      <ButtonIcon
        icon={<IconExpand />}
        mode="ghost"
        disabled={disabled}
        onClick={() => setIsExpanded(!isExpanded)}
      />
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
  const [isExpanded, setIsExpanded] = useState(false);
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

  if (isExpanded) {
    document.onkeydown = e => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(!isExpanded);
      }
    };

    let portalNode = document.querySelector('#fullscreen-editor');
    if (!portalNode) {
      const div = document.createElement('div');
      div.id = 'fullscreen-editor';
      document.body.appendChild(div);
      portalNode = div;
    }

    const fullScreenEditor = (
      <Container disabled={disabled} fullScreen>
        <MenuBar
          disabled={disabled}
          editor={editor}
          fullScreen
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
        <StyledEditorContent editor={editor} />
      </Container>
    );

    return ReactDOM.createPortal(fullScreenEditor, portalNode);
  }

  return (
    <Container disabled={disabled}>
      <MenuBar
        disabled={disabled}
        editor={editor}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      />
      <StyledEditorContent editor={editor} />
    </Container>
  );
};

type Props = {
  disabled: boolean;
  fullScreen?: boolean;
};

const Container = styled.div.attrs(({disabled, fullScreen = false}: Props) => ({
  className: `w-full text-ui-600 ${
    fullScreen
      ? 'h-screen flex flex-col'
      : 'rounded-xl border-2 border-ui-100 hover:border-ui-300'
  } ${disabled ? 'bg-ui-100 border-ui-200' : 'bg-white'}`,
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

const StyledMenuBar = styled.div.attrs(({disabled, fullScreen}: Props) => ({
  className: `bg-ui-50 px-2 py-1.5 flex justify-between ${
    !fullScreen && 'rounded-t-xl'
  } ${disabled && 'bg-ui-100'}`,
}))<Props>``;

const Toolgroup = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const StyledEditorContent = styled(EditorContent)`
  flex: 1;

  .ProseMirror {
    padding: 12px 16px;
    height: 100%;
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
