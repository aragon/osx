import React from 'react';
import styled from 'styled-components';
import {TableCell} from './tableCell';
import {Badge} from '../badge';
import {IconChevronDown} from '../icons';
import {Link} from '../link';

export type VoterType = {
  wallet: string;
  option: 'Yes' | 'No';
  votingPower: string;
  tokenAmount: string;
};

export type VotersTableProps = {
  voters: Array<VoterType>;
  onLoadMore: () => void;
};

export const VotersTable: React.FC<VotersTableProps> = ({
  voters,
  onLoadMore,
}) => {
  return (
    <Table data-testid="votersTable">
      <thead>
        <tr>
          <TableCell type="head" text="Wallet" />
          <TableCell type="head" text="Option" />
          <TableCell type="head" text="Voting Power" rightAligned />
          <TableCell type="head" text="Token Amount" rightAligned />
        </tr>
      </thead>
      <tbody>
        {voters.map((voter, index) => (
          <tr key={index}>
            <TableCell type="text" text={voter.wallet} />
            <TableCell type="tag">
              <Badge
                label={voter.option}
                colorScheme={voter.option === 'Yes' ? 'success' : 'critical'}
              />
            </TableCell>
            <TableCell type="text" text={voter.votingPower} rightAligned />
            <TableCell type="text" text={voter.tokenAmount} rightAligned />
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <TableCell type="link">
            <Link
              label="Load More"
              iconRight={<IconChevronDown />}
              onClick={onLoadMore}
            />
          </TableCell>
          <TableCell type="text" text="" />
          <TableCell type="text" text="" />
          <TableCell type="text" text="" />
        </tr>
      </tfoot>
    </Table>
  );
};

export const Table = styled.table.attrs({
  className:
    'border-separate w-full block tablet:table overflow-x-auto whitespace-nowrap',
})`
  border-spacing: 0;

  tr th,
  tr td {
    border-bottom: 1px solid #e4e7eb;
  }

  tr th:first-child,
  tr td:first-child {
    border-left: 1px solid #e4e7eb;
  }

  tr th:last-child,
  tr td:last-child {
    border-right: 1px solid #e4e7eb;
  }

  tr th {
    border-top: 1px solid #e4e7eb;
  }

  tr:first-child th:first-child {
    border-top-left-radius: 12px;
  }

  tr:first-child th:last-child {
    border-top-right-radius: 12px;
  }

  tfoot td:first-child {
    border-bottom-left-radius: 12px;
  }

  tfoot td:last-child {
    border-bottom-right-radius: 12px;
  }
`;
