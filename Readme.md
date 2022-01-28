# Zaragoza

This workspace contains all packages related to the Zaragoza project - the human centered approach to Daos.

For more information on the individual packages, please read the respective `Readme.md`.

## Setup

start by running `yarn install` in the root.

### Dependencies

Most of the UI components used in the web-app are defined in a separate package called ui-components. Since the repo was set up as yarn workspace, all the linking is done automatically. The only thing you need to run the web-app is a build of that package. To do that `cd packages/ui-components` and then simply `yarn build`.

### Web-app

To run the web-app, change into the respective package folder and run `yarn dev`.

### Storybook

To run the story book that documents the `ui-components`, change into the respective package folder and run `yarn storybook`.
