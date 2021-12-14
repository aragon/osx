import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from 'react';

const WalletMenuContext = createContext<WalletMenuContextType | null>(null);

type WalletMenuContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

type Props = Record<'children', ReactNode>;

const WalletMenuProvider: React.FC<Props> = ({children}) => {
  const [isOpen, setIsOpen] = useState<WalletMenuContextType['isOpen']>(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const value = useMemo(
    (): WalletMenuContextType => ({
      isOpen,
      open,
      close,
    }),
    [isOpen]
  );

  return (
    <WalletMenuContext.Provider value={value}>
      {children}
    </WalletMenuContext.Provider>
  );
};

function useWalletMenuContext(): WalletMenuContextType {
  return useContext(WalletMenuContext) as WalletMenuContextType;
}

export {useWalletMenuContext, WalletMenuProvider};
