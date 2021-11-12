import React from 'react';

export type ActionListItemProps = {
  title: string;
  subtitle: string;
};

/**
 * List group action item
 */
export const ActionListItem: React.FC<ActionListItemProps> = ({
  title,
  subtitle,
}) => {
  return (
    <div
      data-testid="actionListItem"
      className="flex justify-between items-center py-1.5 px-2 space-x-1.5 .box-border border-2 border-ui-100 active:border-ui-800 rounded-xl"
    >
      <div>
        <p className="font-semibold text-ui-600">{title}</p>
        <p className="font-semibold text-xs text-ui-400">{subtitle}</p>
      </div>
      <div className="flex justify-center items-center w-2 h-2 border"></div>
    </div>
  );
};
