import React from 'react';

import HomePage from 'pages/home';
import * as paths from 'utils/paths';
import FinancePage from 'pages/finance';
import NotFoundPage from 'pages/notFound';
import CommunityPage from 'pages/community';
import GovernancePage from 'pages/governance';

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

  // Temporary route to test breadcrumbs
  {
    name: 'Temp Finance subroute',
    path: paths.Finance + '/abc',
    component: FinancePage,
    exact: true,
    breadcrumb: 'Temp Finance Subroute',
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
