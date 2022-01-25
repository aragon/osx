import React, {useState, useEffect} from 'react';
import styled from 'styled-components';
import {IconChevronRight, IconChevronLeft} from '../icons/interface';
import {ButtonText, ButtonIcon} from '../button';
export interface PaginationProps {
  /**
   * white background
   */
  bgWhite?: boolean;
  /**
   * Number of total pages
   */
  totalPages?: number;
  /**
   * active page
   */
  activePage?: number;
  /**
   * With this parameter we can define break points for
   * change pagination from 1...567...9 to 1...789
   * views
   */
  distance?: number;
  onChange?: (page: number) => void;
}

/**
 * Default UI component
 */
export const Pagination: React.FC<PaginationProps> = ({
  totalPages = 10,
  activePage = 1,
  bgWhite = false,
  distance = 3,
  onChange,
}) => {
  const [page, setPage] = useState<number>(activePage);

  useEffect(() => {
    onChange && onChange(page);
  }, [onChange, page]);

  function ButtonList() {
    const list = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        list.push(
          <ButtonText
            mode="secondary"
            size="large"
            isActive={page === i}
            onClick={() => setPage(i)}
            {...(bgWhite && {bgWhite})}
            label={`${i}`}
            key={i}
          />
        );
      }
      return <>{list}</>;
    }

    if (page - 1 <= distance) {
      for (let i = 1; i <= 5; i++) {
        list.push(
          <ButtonText
            mode="secondary"
            size="large"
            isActive={page === i}
            onClick={() => setPage(i)}
            {...(bgWhite && {bgWhite})}
            label={`${i}`}
            key={i}
          />
        );
      }
      return (
        <>
          {list}
          <Separator>...</Separator>
          <ButtonText
            mode="secondary"
            size="large"
            onClick={() => setPage(totalPages)}
            {...(bgWhite && {bgWhite})}
            label={`${totalPages}`}
          />
        </>
      );
    }

    if (totalPages - page <= distance) {
      for (let i = totalPages - 4; i <= totalPages; i++) {
        list.push(
          <ButtonText
            mode="secondary"
            size="large"
            isActive={page === i}
            onClick={() => setPage(i)}
            {...(bgWhite && {bgWhite})}
            label={`${i}`}
            key={i}
          />
        );
      }
      return (
        <>
          <ButtonText
            mode="secondary"
            size="large"
            onClick={() => setPage(1)}
            {...(bgWhite && {bgWhite})}
            label={`${1}`}
          />
          <Separator>...</Separator>
          {list}
        </>
      );
    }

    for (let i = page - 1; i <= page + 1; i++) {
      list.push(
        <ButtonText
          mode="secondary"
          size="large"
          isActive={page === i}
          onClick={() => setPage(i)}
          {...(bgWhite && {bgWhite})}
          label={`${i}`}
          key={i}
        />
      );
    }
    return (
      <>
        <ButtonText
          mode="secondary"
          size="large"
          onClick={() => setPage(1)}
          {...(bgWhite && {bgWhite})}
          label={'1'}
        />
        <Separator>...</Separator>
        {list}
        <Separator>...</Separator>
        <ButtonText
          mode="secondary"
          size="large"
          onClick={() => setPage(totalPages)}
          {...(bgWhite && {bgWhite})}
          label={`${totalPages}`}
        />
      </>
    );
  }

  return (
    <HStack data-testid="pagination">
      <ButtonIcon
        mode="secondary"
        size="large"
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
        icon={<IconChevronLeft />}
        {...(bgWhite && {bgWhite})}
      />
      <ButtonList />
      <ButtonIcon
        mode="secondary"
        size="large"
        onClick={() => setPage(page + 1)}
        disabled={page === totalPages}
        icon={<IconChevronRight />}
        {...(bgWhite && {bgWhite})}
      />
    </HStack>
  );
};

const HStack = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const Separator = styled.div.attrs({
  className: 'flex items-center',
})``;
