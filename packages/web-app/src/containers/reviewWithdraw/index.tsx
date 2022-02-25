import {EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import {useTranslation} from 'react-i18next';
import {useFormContext} from 'react-hook-form';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';

import {
  Badge,
  ButtonText,
  IconChevronDown,
  IconChevronUp,
  CardExecution,
  Link,
} from '@aragon/ui-components';
import ResourceList from 'components/resourceList';
import {VotingTerminal} from 'containers/votingTerminal';

const ReviewWithdraw: React.FC = () => {
  const [expandedProposal, setExpandedProposal] = useState(false);
  const {getValues, setValue} = useFormContext();
  const {t} = useTranslation();
  const values = getValues();
  const editor = useEditor({
    editable: false,
    content: values.proposal,
    extensions: [
      StarterKit,
      TipTapLink.configure({
        openOnClick: false,
      }),
    ],
  });

  useEffect(() => {
    if (values.proposal === '<p></p>') {
      setValue('proposal', '');
    }
  }, [setValue, values.proposal]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <Header>{values.proposalTitle}</Header>
      <BadgeContainer>
        <div className="flex space-x-1.5">
          <Badge label="Finance" />
          <Badge label="Withdraw" />
        </div>
        <ProposerLink>
          {t('governance.proposals.publishedBy')}{' '}
          <Link
            external
            label={'you'}
            // label={shortenAddress(publisherAddress || '')}
            // href={`${explorers[chainId]}${publisherAddress}`}
          />
        </ProposerLink>
      </BadgeContainer>

      <SummaryText>{values.proposalSummary}</SummaryText>

      {values.proposal && !expandedProposal && (
        <ButtonText
          className="mt-3 w-full tablet:w-max"
          label={t('governance.proposals.buttons.readFullProposal')}
          mode="secondary"
          iconRight={<IconChevronDown />}
          onClick={() => setExpandedProposal(true)}
        />
      )}

      <ContentContainer expandedProposal={expandedProposal}>
        <ProposalContainer>
          {values.proposal && expandedProposal && (
            <>
              <StyledEditorContent editor={editor} />

              <ButtonText
                className="mt-3 w-full tablet:w-max"
                label={t('governance.proposals.buttons.closeFullProposal')}
                mode="secondary"
                iconRight={<IconChevronUp />}
                onClick={() => setExpandedProposal(false)}
              />
            </>
          )}

          {/*
            TODO: All the values inside the voting terminal is hardcoded.
            The info tab needs to display data from the form context & graph query
          */}
          <VotingTerminal breakdownTabDisabled votersTabDisabled />

          <CardExecution
            title={t('governance.executionCard.title')}
            description={t('governance.executionCard.description')}
            to={values.to}
            from={values.from}
            toLabel={t('labels.to')}
            fromLabel={t('labels.from')}
            tokenName={values.tokenName}
            tokenImageUrl={values.tokenImgUrl}
            tokenSymbol={values.tokenSymbol}
            tokenCount={values.amount}
            treasuryShare={`$${values.tokenPrice * values.amount}`}
          />
        </ProposalContainer>

        <AdditionalInfoContainer>
          <ResourceList links={values.links} />
        </AdditionalInfoContainer>
      </ContentContainer>
    </>
  );
};

export default ReviewWithdraw;

const Header = styled.p.attrs({className: 'font-bold text-ui-800 text-3xl'})``;

const BadgeContainer = styled.div.attrs({
  className: 'tablet:flex items-baseline mt-3 tablet:space-x-3',
})``;

const ProposerLink = styled.p.attrs({
  className: 'mt-1.5 tablet:mt-0 text-ui-500',
})``;

const SummaryText = styled.p.attrs({
  className: 'text-lg text-ui-600 mt-3',
})``;

const ProposalContainer = styled.div.attrs({
  className: 'space-y-3 tablet:w-3/5',
})``;

const AdditionalInfoContainer = styled.div.attrs({
  className: 'space-y-3 tablet:w-2/5',
})``;

type ContentContainerProps = {
  expandedProposal: boolean;
};

const ContentContainer = styled.div.attrs(
  ({expandedProposal}: ContentContainerProps) => ({
    className: `${
      expandedProposal ? 'tablet:mt-5' : 'tablet:mt-8'
    } mt-3 tablet:flex tablet:space-x-3 space-y-3 tablet:space-y-0`,
  })
)<ContentContainerProps>``;

const StyledEditorContent = styled(EditorContent)`
  flex: 1;

  .ProseMirror {
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
`;
