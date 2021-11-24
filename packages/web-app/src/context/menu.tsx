import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from 'react';

const MenuContext = createContext<MenuContextType | null>(null);

type MenuContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

type Props = Record<'children', ReactNode>;

const MenuProvider: React.FC<Props> = ({children}) => {
  const [isOpen, setIsOpen] = useState<MenuContextType['isOpen']>(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const value = useMemo(
    (): MenuContextType => ({
      isOpen,
      open,
      close,
    }),
    [isOpen]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

function useMenuContext(): MenuContextType {
  return useContext(MenuContext) as MenuContextType;
}

export {useMenuContext, MenuProvider};
