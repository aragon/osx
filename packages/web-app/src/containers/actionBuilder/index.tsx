import React from 'react';

import {useActionsContext} from 'context/actions';
import WithdrawAction from './withdraw/withdrawAction';
import {ActionsTypes} from 'utils/types';
import {AddActionItems} from '../addActionMenu';
import TokenMenu from 'containers/tokenMenu';
import {BaseTokenInfo, ActionItem} from 'utils/types';
import {fetchTokenPrice} from 'services/prices';
import {useDaoTokens} from 'hooks/useDaoTokens';
import {formatUnits} from 'utils/library';
import {useFormContext} from 'react-hook-form';

/**
 * This Component is responsible for generating all actions that append to pipeline context (actions)
 * In future we can add more action template like: mint token Component
 * or custom action component (for smart contracts methods)
 * @returns List of actions
 */

type actionsComponentType = {
  name: ActionsTypes;
  index: number;
};

const Action: React.FC<actionsComponentType> = ({name, index}) => {
  switch (name) {
    case AddActionItems.WITHDRAW_ASSETS:
      return <WithdrawAction {...{index}} />;
    default:
      return null;
  }
};

const ActionBuilder: React.FC = () => {
  const {actionsCounter: index, actions} = useActionsContext();
  const {data: tokens} = useDaoTokens('myDaoAddress');
  const {setValue, resetField, clearErrors} = useFormContext();

  /*************************************************
   *             Callbacks and Handlers            *
   *************************************************/

  const handleTokenSelect = (token: BaseTokenInfo) => {
    setValue(`actions.${index}.tokenSymbol`, token.symbol);

    if (token.address === '') {
      setValue(`actions.${index}.isCustomToken`, true);
      resetField(`actions.${index}.tokenName`);
      resetField(`actions.${index}.tokenImgUrl`);
      resetField(`actions.${index}.tokenAddress`);
      resetField(`actions.${index}.tokenBalance`);
      clearErrors(`actions.${index}.amount`);
      return;
    }

    setValue(`actions.${index}.isCustomToken`, false);
    setValue(`actions.${index}.tokenName`, token.name);
    setValue(`actions.${index}.tokenImgUrl`, token.imgUrl);
    setValue(`actions.${index}.tokenAddress`, token.address);
    setValue(
      `actions.${index}.tokenBalance`,
      formatUnits(token.count, token.decimals)
    );

    fetchTokenPrice(token.address).then(price => {
      setValue(`actions.${index}.tokenPrice`, price);
    });
  };

  return (
    <>
      {actions?.map((action: ActionItem, index: number) => (
        <Action key={index} name={action?.name} {...{index}} />
      ))}
      <TokenMenu
        isWallet={false}
        onTokenSelect={handleTokenSelect}
        tokenBalances={tokens}
      />
    </>
  );
};

export default ActionBuilder;
