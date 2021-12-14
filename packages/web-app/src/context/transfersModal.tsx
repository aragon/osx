import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from 'react';

const TransferModalContext = createContext<TransferModalContextType | null>(
  null
);

type TransferModalContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

type Props = Record<'children', ReactNode>;

const TransferModalsProvider: React.FC<Props> = ({children}) => {
  const [isOpen, setIsOpen] =
    useState<TransferModalContextType['isOpen']>(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const value = useMemo(
    (): TransferModalContextType => ({
      isOpen,
      open,
      close,
    }),
    [isOpen]
  );

  return (
    <TransferModalContext.Provider value={value}>
      {children}
    </TransferModalContext.Provider>
  );
};

function useTransferModalContext(): TransferModalContextType {
  return useContext(TransferModalContext) as TransferModalContextType;
}

export {useTransferModalContext, TransferModalsProvider};
