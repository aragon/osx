import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';
import styled from 'styled-components';

// NOTE: I'm not sure whether having a callback per list item is the ideal API
// for this component. The reasoning for doing it this way, is that this
// simplifies triggering action off of a menu item. Instead of having to watch
// for changes on a state handled by the parent and take action based on that
// state changing. Maybe I'm wrong, though. We can always add value/setValue
// props controlled by the parent's later, if that proves more useful.
// [VR 21-02-2022]

export type ListItemProps = {
  /**
   * The components to render as list item. Typically, a <ListItem /> component.
   */
  component: React.ReactNode;
  /**
   * The function that will be called when this list item is selected (via
   * keyboard, mouse, etc).
   */
  callback: (event: Event) => void;
};

export type CustomDropdownContentProps = Omit<
  DropdownMenu.DropdownMenuContentProps,
  'asChild' | '__scopeDropdownMenu'
>;

export type DropdownProps = CustomDropdownContentProps & {
  /**
   * Element that triggers the opening state of the dropdown menu.
   */
  trigger: React.ReactNode;
  /**
   * The items inside the open dropdown menu.
   */
  listItems: ListItemProps[];
};

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  listItems,
  ...rest
}: DropdownProps) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger data-testid="dropdown-trigger">
        {trigger}
      </DropdownMenu.Trigger>

      <StyledContent {...rest}>
        <DropdownMenu.Group className="space-y-0.5">
          {listItems?.map((li, index) => (
            <StyledItem key={index} onSelect={li.callback} style={{}}>
              {li.component}
            </StyledItem>
          ))}
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
      </StyledContent>
    </DropdownMenu.Root>
  );
};

const StyledContent = styled(DropdownMenu.Content).attrs({
  className: 'bg-ui-0 rounded-lg p-2 shadow-xl' as string | undefined,
})``;

const StyledItem = styled(DropdownMenu.Item).attrs({
  className: 'rounded-xl focus-visible:outline-primary',
})``;
