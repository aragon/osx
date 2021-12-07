import React from 'react';

import HomePage from 'pages/home';
import * as paths from 'utils/paths';
import TokensPage from 'pages/tokens';
import FinancePage from 'pages/finance';
import NotFoundPage from 'pages/notFound';
import CommunityPage from 'pages/community';
import TransfersPage from 'pages/transfers';
import GovernancePage from 'pages/governance';
import Tokens from './pages/tokens';

export type PageRoute = {
  exact: boolean;
  name: string;
  path: string;
  component: React.FC;
  breadcrumb?: string;
};

// Note that order matters if all routes aren't exact
export const routes: PageRoute[] = [
  {
    name: 'Community',
    path: paths.Community,
    component: CommunityPage,
    exact: true,
  },
  {
    name: 'Dashboard',
    path: paths.Dashboard,
    component: HomePage,
    exact: true,
  },
  {
    name: 'Finance',
    path: paths.Finance,
    component: FinancePage,
    exact: true,
  },
  {
    name: 'All Tokens',
    path: paths.AllTokens,
    component: Tokens,
    exact: true,
  },

  {
    name: 'Transfers',
    path: paths.AllTransfers,
    component: TransfersPage,
    exact: true,
  },
  {
    name: 'Tokens',
    path: paths.AllTokens,
    component: TokensPage,
    exact: true,
  },
  {
    name: 'Governance',
    path: paths.Governance,
    component: GovernancePage,
    exact: true,
  },

  /**
   * Note: Specific NotFound route being used to
   * easily disable breadcrumbs on routes that aren't found.
   * Using '*' will match all paths and disable breadcrumbs entirely
   */
  {
    name: 'NotFound',
    path: paths.NotFound,
    component: NotFoundPage,
    exact: true,
  },
];
