export default [
  // Rich accounts with pre-funded balances for the chain on port 8545.
  // These accounts are used for testing purposes and have sufficient funds.
  '0x3d3cbc973389cb26f657686445bcc75662b415b656078503592ac8c1abb8810e',
  '0x509ca2e9e6acf0ba086477910950125e698d4ea70fa6f63e000c5a22bda9361c',
  '0x71781d3a358e7a65150e894264ccc594993fbc0ea12d69508a340bc1d4f5bfbc',
  '0x379d31d4a7031ead87397f332aab69ef5cd843ba3898249ca1046633c0c7eefe',
  '0x105de4e75fe465d075e1daae5647a02e3aad54b8d23cf1f70ba382b9f9bee839',
  '0x7becc4a46e0c3b512d380ca73a4c868f790d1055a7698f38fb3ca2b2ac97efbb',
  '0xe0415469c10f3b1142ce0262497fe5c7a0795f0cbfd466a6bfa31968d0f70841',
  '0x4d91647d0a8429ac4433c83254fb9625332693c848e578062fe96362f32bfe91',
  '0x41c9f9518aa07b50cb1c0cc160d45547f57638dd824a8d85b5eb3bf99ed2bdeb',
  '0xb0680d66303a0163a19294f1ef8c95cd69a9d7902a4aca99c05f3e134e68a11a',
  // Additional accounts to ensure ethers.getSigners() returns 20 addresses.
  // zkSync only returns 10 accounts by default, which may break tests
  // that expect more. Adding these extra accounts prevents the need
  // to rewrite tests by maintaining a consistent 20 accounts.
  // ethers.getSigners() still return 20 addresses instead of 10.
  '0xec4822aa037f555ba18304bfcb6e30f3c981e730f57e7bad174312868952af90',
  '0x00058bfe32cbfe46e81a7c60178fae13078068b5a3a8e1441d47f7cb96665286',
  '0x4e0e42d531f61e25f12d64504ec5f021ead984c406fb5df97d27d813d11222a3',
  '0x9534dcb0f1e8c94c8c936b39d8a5667169df34d80966d13fe7ab9ef0c78c704a',
  '0xe6c08ed153863f48ccb843b6ba82e4880cd30a0874309a291d214a3a7d794499',
  '0x247411619389bbc301816f8928c568115c7e340daf950e241f447bcb68644f92',
  '0xaff4231bc7ef2141fe25aea9d957114064a778a1aeb54276ea8b6576b958d30f',
  '0x7c81899f9d699ce7eeea50ce47fbcf2bd84ae5d7d1b6eb01cd9eedd73eac13ee',
  '0xab5f8bf24c10790972c3a25c78e7ae070619d07c93dd189f86ccac67e82da837',
  '0x23d60e6c95faf5d242edeaed780868fb55f85556764dcc11082dd40d9a2ffd3f',
];
