# Contribution Guide

---

Thank you for being interested in contributing to Aragon! 🎉  We’re excited to have you building this vision with us.

There are many ways to contribute! Some ideas are:

- writing tutorials, blog posts or improving the documentation,
- submitting bug reports,
- submitting feature requests,
- refactoring code,
- or even writing new functionality to incorporate into the project.

All members of our community are expected to follow our [Code of Conduct](https://discord.com/channels/672466989217873929/953988031713534022/1037740253080997918). Please make sure you are welcoming and friendly in all of our spaces. This is a non-negotiable 💙

## Your first contribution

Unsure where to begin contributing to Aragon?

You can start with a [Good First Issue](https://github.com/aragon/osx/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

> Good first issues are usually for small features, additional tests, spelling / grammar fixes, formatting changes, or other clean up.

Start small, pick a subject you care about, are familiar with, or want to learn.

If you're not already familiar with git or Github, here are a couple of friendly tutorials: [First Contributions](https://github.com/firstcontributions/first-contributions), [Open Source Guide](https://opensource.guide/), and [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

Otherwise, you can also contribute through improving our documentation. You can find our documentation within the `docs` folder of each of our repositories. If you see something that could be better explained, or if you want to share better resources for each of the topics, we’d love to hear from you. Feel free to either submit a PR directly to the repo or simply [register here](https://aragonteam.typeform.com/to/QJyKtESU) and we’ll reach out.

## How to file an issue or report a bug

If you see a problem, you can report it in our [issue tracker](https://github.com/aragon/osx/issues) (or [here](https://aragonteam.typeform.com/to/QJyKtESU)).

Please take a quick look to see if the issue doesn't already exist before filing yours.

Do your best to include as many details as needed in order for someone else to fix the problem and resolve the issue.

Some things that help us better understand:

- Device: which device are you using, which version, how old is it, etc
- Browser: which browser are you using, which version..
- Wallet: which wallet do you use to sign transactions
- Network: which network have you been testing on
- Logs: any specific transaction error or log that may support us in reviewing the error

### If you find a security vulnerability, do NOT open an issue. Email [security@aragon.org](mailto:security@aragon.org) instead.

In order to determine whether you are dealing with a security issue, ask yourself these two questions:

- Can I access or steal something that's not mine, or access something I shouldn't have access to?
- Can I disable something for other people?

If the answer to either of those two questions are "yes", then you're probably dealing with a security issue. Note that even if you answer "no" to both questions, you may still be dealing with a security issue, so if you're unsure, please send a email.

## Fixing issues

1. [Find an issue](https://github.com/aragon/osx/issues) that you are interested in.
   - You may want to ask on the GitHub issue or in our [developer channel](https://discord.com/channels/672466989217873929/1036683514525003796) if anyone has already started working on the issue.
2. Fork and clone a local copy of the repository.
3. Make the appropriate changes for the issue you are trying to address or the feature that you want to add.
4. Push the changes to the remote repository.
5. Submit a pull request to our repository on Github, explaining any changes and further questions you may have.

   We kindly ask that every PR follows this format and checks all checkboxes.

   ```markdown
   ## Description

   ## Type of change

   ## Checklist

   [ ] I have selected the correct base branch.
   [ ] I have performed a self-review of my own code.
   [ ] I have commented my code, particularly in hard-to-understand areas.
   [ ] I have made corresponding changes to the documentation.
   [ ] My changes generate no new warnings.
   [ ] Any dependent changes have been merged and published in downstream modules.
   [ ] I ran all tests with success and extended them if necessary.
   [ ] I have updated the CHANGELOG.md file in the root folder of the package after the [UPCOMING] title and before the latest version.
   [ ] I have tested my code on the test network.
   ```

6. Wait for the pull request to be reviewed by the team.
7. Make adjustments to the pull request if they were requested by the maintainer.
8. Celebrate your success after your pull request is merged! You will be able to claim your POAP for the hard work and join our Developer Inner Circle community.

**Disclaimer**

It's OK if your pull request is not perfect (no pull request is). The reviewer will be able to help you address any issues and improve it.

### Tips and Tricks

Windows users may need to install the [windows-build-tools](https://www.npmjs.com/package/windows-build-tools) or [Windows Subsystems for Linux](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) before installing this project's dependencies.

### Documentation

The documentation on how to run the code locally will be found within the `docs` folder of every repository.

You can also access our [Developer Portal](https://devs.aragon.org) where you’ll learn about our architecture, how it works, and useful tutorials to get you started.

### Style guide and development processes

You can find our documentation [Style Guide here](https://www.notion.so/Documentation-Style-Guide-07c88cec18114b0aac88e8f0ba289976).

For the frontends, we use [prettier](https://prettier.io/) and [eslint](https://eslint.org/) to automatically lint and format the project.

For the contracts, we use [eth-lint](https://github.com/duaraghav8/Ethlint) and [prettier](https://prettier.io/) to automatically lint the project.

For the SDK, we use [Prettier JS/TS formatter](https://prettier.io/docs/en/editors.html).

Handy `npm` scripts (usually `npm run lint`) are provided at all levels to help automate these checks.

We generally avoid adding external dependencies if they can be ported over easily, due to numerous NPM-related security issues in the past (e.g. `[event-stream](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident)`).

### Git branch convention

Due to the unconventional release process of smart contracts, this repo utilizes a slightly different flow of git.

The main challenge is that smart contracts should be heavily scrutinized before a release, making the process cumbersome and unlike the release process for "normal" dependencies or apps. [See here](https://forum.aragon.org/t/git-branch-convention-for-aragon-repos/298/3) for a more detailed explanation.

Thus, we use the following convention: any change that can be release immediately, base it on the [develop branch](https://github.com/aragon/osx/develop).

As `next` becomes ready, merge `next` onto `master` with a rebase.

## Community

If you need help, please reach out to Aragon core contributors and community members in our [Discord](https://discord.com/channels/672466989217873929/1036683514525003796). We'd love to hear from you and know what you're working on!
