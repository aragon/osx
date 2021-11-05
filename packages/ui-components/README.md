# Zaragoza UI package

## What

This package contains the building block for the Zaragoza web-app. It is directly based on Aragon's design system.

The package is written in typescript and powered by TSDX. The repository also contains a storybook. This allows us to publish the components in isolation, in order to visually present and document them.

## How

Developing the component library in isolation is simple. Make changes, run tests, build the library.

### Storybook

Storybook helps to develop the components, as it allows to visually inspect and document them. Storybook can be run in development mode using `yarn storybook`. This provides the usual hot-reload development environment. To get a deployable version of the Storybook, one can do `yarn-build`, which creates a static build of the story book web-app.

### Workspace

This package is used in the `web-app` package of the `zaragoza` mono-repo. In situations where one needs to work on both at the same time, one can do `yarn watch` in this package. This will launch `tsdx` in watch mode, which rebuilds the `dist` folder (holding the compiled and exported code) on changes to the source code. The changes will therefore be immediately available in the `web-app` package.
