import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from 'react';

const GlobalModalsContext = createContext<GlobalModalsContextType | null>(null);

type GlobalModalsContextType = {
  isTransferOpen: boolean;
  isTokenOpen: boolean;
  isUtcOpen: boolean;
  isTransactionOpen: boolean;
  isSelectDaoOpen: boolean;
  isAddActionOpen: boolean;
  open: (arg?: MenuTypes) => void;
  close: (arg?: MenuTypes) => void;
};

type MenuTypes =
  | 'token'
  | 'utc'
  | 'transaction'
  | 'addAction'
  | 'selectDao'
  | 'default';

type Props = Record<'children', ReactNode>;

/* TODO This should be reworked to have one state that holds the open menu,
instead of one boolean state for each of the menus. This can be done based on a
type like MenuType. Then this context can be extended simply by adding a new
type to MenuTypes. */
const GlobalModalsProvider: React.FC<Props> = ({children}) => {
  const [isTransferOpen, setIsTransferOpen] =
    useState<GlobalModalsContextType['isTransferOpen']>(false);
  const [isTokenOpen, setIsTokenOpen] =
    useState<GlobalModalsContextType['isTokenOpen']>(false);
  const [isUtcOpen, setIsUtcOpen] =
    useState<GlobalModalsContextType['isUtcOpen']>(false);
  const [isTransactionOpen, setIsTransactionOpen] =
    useState<GlobalModalsContextType['isTransactionOpen']>(false);
  const [isAddActionOpen, setIsAddActionOpen] =
    useState<GlobalModalsContextType['isAddActionOpen']>(false);
  const [isSelectDaoOpen, setIsSelectDaoOpen] =
    useState<GlobalModalsContextType['isSelectDaoOpen']>(false);

  const open = (type?: MenuTypes) => {
    switch (type) {
      case 'token':
        setIsTokenOpen(true);
        break;
      case 'utc':
        setIsUtcOpen(true);
        break;
      case 'transaction':
        setIsTransactionOpen(true);
        break;
      case 'addAction':
        setIsAddActionOpen(true);
        break;
      case 'selectDao':
        setIsSelectDaoOpen(true);
        break;
      default:
        setIsTransferOpen(true);
        break;
    }
  };

  const close = (type?: MenuTypes) => {
    switch (type) {
      case 'token':
        setIsTokenOpen(false);
        break;
      case 'utc':
        setIsUtcOpen(false);
        break;
      case 'transaction':
        setIsTransactionOpen(false);
        break;
      case 'addAction':
        setIsAddActionOpen(false);
        break;
      case 'selectDao':
        setIsSelectDaoOpen(false);
        break;
      default:
        setIsTransferOpen(false);
        break;
    }
  };
  /**
   * TODO: ==============================================
   * I used this context for managing all modals but we should
   * categories the modal pages and organize it in a better way
   *====================================================
   */
  // Since the modals can not be open at the same time, I actually think this is
  // a good solution. Keeps the logic in one place and makes it simply to
  // extend. [VR 10-01-2022]

  const value = useMemo(
    (): GlobalModalsContextType => ({
      isTransferOpen,
      isTokenOpen,
      isUtcOpen,
      isTransactionOpen,
      isAddActionOpen,
      isSelectDaoOpen,
      open,
      close,
    }),
    [
      isTransferOpen,
      isTokenOpen,
      isUtcOpen,
      isTransactionOpen,
      isAddActionOpen,
      isSelectDaoOpen,
    ]
  );

  return (
    <GlobalModalsContext.Provider value={value}>
      {children}
    </GlobalModalsContext.Provider>
  );
};

function useGlobalModalContext(): GlobalModalsContextType {
  return useContext(GlobalModalsContext) as GlobalModalsContextType;
}

export {useGlobalModalContext, GlobalModalsProvider};
