const noEnslog = `
    Deploying ManagementDAO.
ManagementDAO will be owned by the (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2) temporarily, while the entire framework is getting deployed. At the final step when Multisig is available, it will be installed on managementDAO and all roles for the Deployer will be revoked.
deploying "ManagementDAOProxy_Implementation" (tx: 0x2bf7a757b707a9e33b8005f4cc218759be81083ff71719b0c002b9f7944f8b07)...: deployed at 0x80863FA5Df6936a160Dd60026726EFC4Bc985099 with 3474248 gas
deploying "ManagementDAOProxy_Proxy" (tx: 0xb6c2a93a9c9bb283cb20e2aa78da737e6b5352b62aace4efc7c2e41954844828)...: deployed at 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5 with 626713 gas
Granting 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 temp execute permissions
Setting 1 permissions. Skipped 0
Set permissions with 0x4968e1f0c0315ecee6ebe3a2f6dc8e938deaa39c13e9fe672b4f73a0656ef3e5. Waiting for confirmation...
Granted the EXECUTE_PERMISSION of (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x4968e1f0c0315ecee6ebe3a2f6dc8e938deaa39c13e9fe672b4f73a0656ef3e5)
Concluding ManagementDao deployment.


Setting ManagementDao permissions.
Setting 6 permissions. Skipped 0
Set permissions with 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae. Waiting for confirmation...
Granted the ROOT_PERMISSION of (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae)
Granted the UPGRADE_DAO_PERMISSION of (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae)
Granted the SET_SIGNATURE_VALIDATOR_PERMISSION of (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae)
Granted the SET_TRUSTED_FORWARDER_PERMISSION of (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae)
Granted the SET_METADATA_PERMISSION of (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae)
Granted the REGISTER_STANDARD_CALLBACK_PERMISSION of (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (managementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0xf9a03555c0d789f0d5f91ab0b168372815c164853827686e0d6ed2640547a8ae)

Verifying management DAO deployment.
Management DAO deployment verified

Deploying framework.
Changing owner of santest4.eth from (currentOwner) 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 to 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5 (newOwner)
Changing owner of plugin.santest4.eth from (currentOwner) 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 to 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5 (newOwner)
deploying "DAOENSSubdomainRegistrarProxy_Implementation" (tx: 0x2d73d69a965d54c409bc4cb9bd87e18c2d1f6f9d34f42fc527576a0bd5835f81)...: deployed at 0xBfF4B946929769238f59dAB6253042CC2a453767 with 1305068 gas
deploying "DAOENSSubdomainRegistrarProxy_Proxy" (tx: 0x71463327228dd04b31c04698e46cc0dacfda49714ffa57a6d33bf1a9987adf6a)...: deployed at 0x23aA7F3B2b4dfe9b2C62b93A0bDeA7333bD656f5 with 400790 gas
deploying "PluginENSSubdomainRegistrarProxy_Implementation" (tx: 0x4224c7e9578c2645c9aa9cbf42486eea0da211256a015bbc07a5a7287bd6c460)...: deployed at 0xd9a1FdD43591b6b257281FF56F557CFd136fDd1A with 1305068 gas
deploying "PluginENSSubdomainRegistrarProxy_Proxy" (tx: 0xdb6cff69a1b4d7f01b4915b3198d7f56632aea007dfe536d52e555bdb3adb576)...: deployed at 0x28F1781AdC51Ca0e21AdB47B8cc4df2de0B386A9 with 400790 gas
Updating controllers of ENS domains with tx 0xcbcb82545d73739fced75de16c6e3e668d959b334e3ed95b3b6c73e816dc363e
Concluding ENS deployment.

No deployment for ENSRegistry found
No deployment for PublicResolver found
deploying "DAORegistryProxy_Implementation" (tx: 0x09428de73bc0a36e0ee2f1e4a3c6681d0779db8743e7fbffa1d0c25fec1f6068)...: deployed at 0x1e43fA7Bcc5566d8436105b4FFCd77e869821c5a with 1385350 gas
deploying "DAORegistryProxy_Proxy" (tx: 0x4395ef1343c60d2e272737957061407f8016942c2b2ea8c08a719e635c818cda)...^[: deployed at 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75 with 370543 gas
Concluding DAO Registry deployment.

deploying "PluginRepoRegistryProxy_Implementation" (tx: 0x08d6d069d4089cbab7719ab485681dd1d86a7dff19309a59e966a757fd648092)...: deployed at 0x059a2986aA2bCa0e0E73941D3195350Be6bCd3Ed with 1387711 gas
deploying "PluginRepoRegistryProxy_Proxy" (tx: 0x7d77e2076dd0f58fe14e93c924acbbf15105a9d3a4b521e9b4467f49646066bf)...: deployed at 0x9fC25913d135a9a976B6AB1F5968dbEfB9785eeE with 370548 gas
Concluding Plugin Repo Registry deployment.

deploying "PluginRepoFactory" (tx: 0x40416ac959e909655290dfeba2a3a305332038c8bda2f2d6f9cb8b35cbcc4359)...: deployed at 0x9CD770CbFD50BCbEF5Ec5E0B5E840d922e420EC5 with 3996433 gas
Concluding Plugin Repo Factory deployment.

deploying "PluginSetupProcessor" (tx: 0x9ab427cdfe60c50f185a006b2f6b441c9d395268dbc86babfc34ed643a885163)...: deployed at 0xdE96B53EBB97cce162CF9D51Ed25B77FC9eBC07d with 2689800 gas
Concluding Plugin Setup Processor deployment.

deploying "DAOFactory" (tx: 0xa2785a9eab8cc8efe40a38b25e1fc22b3b8e668b21322e57e46845f36623157b)...: deployed at 0x50d1b15F0D231906C9ABa8667896e4675fE5d91e with 5306024 gas
Concluding DAOFactory deployment.

deploying "GlobalExecutor" (tx: 0x5d38a9b82051e81deba95a46d37b60968d08236ba8bad67d859089629e8fa0df)...: deployed at 0x0CaF08c8a3C2080B2be3a8c6E6247375C29ffbAd with 568003 gas

Verifying framework deployment.
Framework deployment verified

Setting framework permission.
Setting 4 permissions. Skipped 0
Set permissions with 0x4996d0f5dfc4f7c0fdbf119b157900c90a78b6affa08e60ec6f5bbf96e5e421e. Waiting for confirmation...
Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of (DAOENSSubdomainRegistrarProxy: 0x23aA7F3B2b4dfe9b2C62b93A0bDeA7333bD656f5) for (DAORegistry: 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75), see (tx: 0x4996d0f5dfc4f7c0fdbf119b157900c90a78b6affa08e60ec6f5bbf96e5e421e)
Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of (PluginENSSubdomainRegistrarProxy: 0x28F1781AdC51Ca0e21AdB47B8cc4df2de0B386A9) for (PluginRepoRegistry: 0x9fC25913d135a9a976B6AB1F5968dbEfB9785eeE), see (tx: 0x4996d0f5dfc4f7c0fdbf119b157900c90a78b6affa08e60ec6f5bbf96e5e421e)
Granted the UPGRADE_REGISTRAR_PERMISSION of (DAOENSSubdomainRegistrarProxy: 0x23aA7F3B2b4dfe9b2C62b93A0bDeA7333bD656f5) for (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0x4996d0f5dfc4f7c0fdbf119b157900c90a78b6affa08e60ec6f5bbf96e5e421e)
Granted the UPGRADE_REGISTRAR_PERMISSION of (PluginENSSubdomainRegistrarProxy: 0x28F1781AdC51Ca0e21AdB47B8cc4df2de0B386A9) for (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0x4996d0f5dfc4f7c0fdbf119b157900c90a78b6affa08e60ec6f5bbf96e5e421e)
Setting 2 permissions. Skipped 0
Set permissions with 0x7d19c76ea78b3c347cfaffae9aa4abbbdc380055d034f4e47a5f0252356eccf3. Waiting for confirmation...
Granted the REGISTER_DAO_PERMISSION of (DAORegistryProxy: 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75) for (DAOFactory: 0x50d1b15F0D231906C9ABa8667896e4675fE5d91e), see (tx: 0x7d19c76ea78b3c347cfaffae9aa4abbbdc380055d034f4e47a5f0252356eccf3)
Granted the UPGRADE_REGISTRY_PERMISSION of (DAORegistryProxy: 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75) for (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0x7d19c76ea78b3c347cfaffae9aa4abbbdc380055d034f4e47a5f0252356eccf3)
Setting 2 permissions. Skipped 0
Set permissions with 0x6670333c54c54f2a7c4f929dad6fa55fa7491d01e18420ee3651f3ced913e5a3. Waiting for confirmation...
Granted the REGISTER_PLUGIN_REPO_PERMISSION of (PluginRepoRegistryProxy: 0x9fC25913d135a9a976B6AB1F5968dbEfB9785eeE) for (PluginRepoFactory: 0x9CD770CbFD50BCbEF5Ec5E0B5E840d922e420EC5), see (tx: 0x6670333c54c54f2a7c4f929dad6fa55fa7491d01e18420ee3651f3ced913e5a3)
Granted the UPGRADE_REGISTRY_PERMISSION of (PluginRepoRegistryProxy: 0x9fC25913d135a9a976B6AB1F5968dbEfB9785eeE) for (ManagementDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5), see (tx: 0x6670333c54c54f2a7c4f929dad6fa55fa7491d01e18420ee3651f3ced913e5a3)

Verifying permissions
Permissions verified

Finalizing ManagementDao.
Setting 2 permissions. Skipped 0
Set permissions with 0xf8106851dcdb8276b3003d860c7fb6c9db495098a8d64d7008386cef0a1f9b14. Waiting for confirmation...
Granted the REGISTER_DAO_PERMISSION of (DAORegistryProxy: 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0xf8106851dcdb8276b3003d860c7fb6c9db495098a8d64d7008386cef0a1f9b14)
Granted the SET_METADATA_PERMISSION of (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0xf8106851dcdb8276b3003d860c7fb6c9db495098a8d64d7008386cef0a1f9b14)
Registered the (managingDAO: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) on (DAORegistry: 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75), see (tx: 0x938f6312ebc70b275f61599ff605870cb59da21eca163bed54261ad1a417207c)
Setting 3 permissions. Skipped 0
Set permissions with 0x06bba6cad4156068906d65fd6c24ba94dbc285afbfd8469d6104f02f47ad238c. Waiting for confirmation...
Revoked the REGISTER_DAO_PERMISSION of (DAORegistryProxy: 0x089476f9F8FD332eFf1dD399b1a1941bef8D0b75) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x06bba6cad4156068906d65fd6c24ba94dbc285afbfd8469d6104f02f47ad238c)
Revoked the ROOT_PERMISSION of (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x06bba6cad4156068906d65fd6c24ba94dbc285afbfd8469d6104f02f47ad238c)
Revoked the SET_METADATA_PERMISSION of (ManagementDAOProxy: 0xC520CB59a2fE0D24D7Ef7B3883B7d8F1a24272e5) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x06bba6cad4156068906d65fd6c24ba94dbc285afbfd8469d6104f02f47ad238c)
  `;

const {ethers} = require('hardhat');

async function main() {
  /*
  const log = `
    Deploying ManagementDAO.
ManagementDAO will be owned by the (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2) temporarily, while the entire framework is getting deployed. At the final step when Multisig is available, it will be installed on managementDAO and all roles for the Deployer will be revoked.
deploying "ManagementDAOProxy_Implementation" (tx: 0xbb7102f0e25af0bcaec4ab26721b9b41439089dfde060741939910bae1e38d8f)...: deployed at 0x92ddEd9a1EB14D3572E9A32782a89626fF72c437 with 3474248 gas
deploying "ManagementDAOProxy_Proxy" (tx: 0xafc2bc6bb8d7be4a306a6aa61d0f95dc38f1a87b060f7e875c8b7423d598f73b)...: deployed at 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150 with 626713 gas
Granting 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 temp execute permissions
Setting 1 permissions. Skipped 0
Set permissions with 0xe042880103794d9f725d6d4187a281caef9fe3c8e9f5c09067afe7e79a731cc7. Waiting for confirmation...
Granted the EXECUTE_PERMISSION of (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0xe042880103794d9f725d6d4187a281caef9fe3c8e9f5c09067afe7e79a731cc7)
Concluding ManagementDao deployment.


Setting ManagementDao permissions.
Setting 6 permissions. Skipped 0
Set permissions with 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf. Waiting for confirmation...
Granted the ROOT_PERMISSION of (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf)
Granted the UPGRADE_DAO_PERMISSION of (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf)
Granted the SET_SIGNATURE_VALIDATOR_PERMISSION of (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf)
Granted the SET_TRUSTED_FORWARDER_PERMISSION of (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf)
Granted the SET_METADATA_PERMISSION of (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf)
Granted the REGISTER_STANDARD_CALLBACK_PERMISSION of (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (managementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xc8af8702d9e133ae385095439d6421dc17150b8f59bfdebbdc30e12c8d7c49bf)

Verifying management DAO deployment.
Management DAO deployment verified

Deploying framework.
deploying "ENSRegistry" (tx: 0x47e8ec9d9ce7e7419ce8c104f09958ac8496056c0dee998f1df818d83f928bec)...: deployed at 0x3ec8B0A306fD0C0e175852A86C226DdE944A4a21 with 656607 gas
Registering subdomain dao.eth
Registered subdomain dao.eth
Registering subdomain plugin-dao.eth
Registered subdomain plugin-dao.eth
ENS Setup complete!
Changing owner of  from (currentOwner) 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 to 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150 (newOwner)
Changing owner of eth from (currentOwner) 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 to 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150 (newOwner)
Changing owner of dao.eth from (currentOwner) 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 to 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150 (newOwner)
Changing owner of plugin-dao.eth from (currentOwner) 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2 to 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150 (newOwner)
deploying "DAOENSSubdomainRegistrarProxy_Implementation" (tx: 0x314102ddec23965db84ddc5832947f1ecf47bb005419fc874c1026b62b3911ce)...: deployed at 0x96822d166ce19B0672FEe0D316D55B0Efa29dE4c with 1305068 gas
deploying "DAOENSSubdomainRegistrarProxy_Proxy" (tx: 0xc5d92adfa39afaa4ad6c4cbdadeaf865876eb2b02404c98c354051c68cceac61)...: deployed at 0xd9EddC2D6A299c336676FdA6987740EaDC591ce0 with 398615 gas
deploying "PluginENSSubdomainRegistrarProxy_Implementation" (tx: 0x0c5d8e7e09df174441b02a1a8d494217ea5d14a276d71339ebf21cea43ccab9c)...: deployed at 0x6F3278c5D80be0719597f821d8bB7c0325Ab92eC with 1305068 gas
deploying "PluginENSSubdomainRegistrarProxy_Proxy" (tx: 0xd71aea228fa398cff8c83a2ca6e5c85c96c0b389339eb60efbc047c0c2c21ebf)...: deployed at 0xb6Cad49448c6141baAB5CD024e7Fce202E959647 with 398615 gas
Updating controllers of ENS domains with tx 0xf5392514da634c698baf500a08c0db0490c8774fa36011477c6ffe6e0fbc272e
Concluding ENS deployment.

deploying "DAORegistryProxy_Implementation" (tx: 0xe566f4874e1207b47a541664eb7983009e2840b2b838e4879b9aaea70b7d84d6)...: deployed at 0x32e840184f1F866B266B46Ab18f0d5e32B19B47c with 1385350 gas
deploying "DAORegistryProxy_Proxy" (tx: 0xf9a1842c50272b47709f21f2ee69749e58ffade3fc1b14566873a44472ef6b0d)...: deployed at 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d with 370543 gas
Concluding DAO Registry deployment.

deploying "PluginRepoRegistryProxy_Implementation" (tx: 0x3f996579b7d1e04feaee2b5cb6a74c4458d7ea8277c1517cd97f0f87cb047da3)...: deployed at 0x7ee29146B9866e6cadf004EAeA51B4B0071C35D6 with 1387711 gas
deploying "PluginRepoRegistryProxy_Proxy" (tx: 0xc90366c756d2d4cabba2fa75b6f6fb634b09d1d5a570180a6183cf5bbe59b2ef)...: deployed at 0x66c7C4B7868b130Ece8eedda702808A7b37BbdaD with 370548 gas
Concluding Plugin Repo Registry deployment.

deploying "PluginRepoFactory" (tx: 0xe6af5e86b088d63bf974f942b7d6b418c83f4fb8f46d9e25a6e83d56492d4f92)...: deployed at 0x9C1e82F3C717dF3a650E1665705c46EA2123Bc59 with 3996433 gas
Concluding Plugin Repo Factory deployment.

deploying "PluginSetupProcessor" (tx: 0xb1ec3e9898524590fa43dc3df1e61f8032f5ce08758c952c3744b78db43cdfe9)...: deployed at 0x75Eef4fbaA5BCec56906C597B33ACe7451D2B5a0 with 2689800 gas
Concluding Plugin Setup Processor deployment.

deploying "DAOFactory" (tx: 0x63520be7b77a116b01033eb170668dd8a1898f23a7cbabb09d2cb53f5c7d6533)...: deployed at 0x8581e35c4B2f649CaCEAb02BC9e23A1F98449E38 with 5306024 gas
Concluding DAOFactory deployment.

deploying "GlobalExecutor" (tx: 0xe6ee5d2fadf300b153ea58232b0f05408b28893f26ce8ca43b31d37aca732843)...: deployed at 0x7913C0fbc089D20a85011b51B0E8C6B5BC99D9E7 with 568003 gas

Verifying framework deployment.
Framework deployment verified

Setting framework permission.
Setting 4 permissions. Skipped 0
Set permissions with 0xff447ad5f0b5e8ac74d0178d2169a7123cb06a5cabdf7bf2b56b5b0b86970497. Waiting for confirmation...
Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of (DAOENSSubdomainRegistrarProxy: 0xd9EddC2D6A299c336676FdA6987740EaDC591ce0) for (DAORegistry: 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d), see (tx: 0xff447ad5f0b5e8ac74d0178d2169a7123cb06a5cabdf7bf2b56b5b0b86970497)
Granted the REGISTER_ENS_SUBDOMAIN_PERMISSION of (PluginENSSubdomainRegistrarProxy: 0xb6Cad49448c6141baAB5CD024e7Fce202E959647) for (PluginRepoRegistry: 0x66c7C4B7868b130Ece8eedda702808A7b37BbdaD), see (tx: 0xff447ad5f0b5e8ac74d0178d2169a7123cb06a5cabdf7bf2b56b5b0b86970497)
Granted the UPGRADE_REGISTRAR_PERMISSION of (DAOENSSubdomainRegistrarProxy: 0xd9EddC2D6A299c336676FdA6987740EaDC591ce0) for (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xff447ad5f0b5e8ac74d0178d2169a7123cb06a5cabdf7bf2b56b5b0b86970497)
Granted the UPGRADE_REGISTRAR_PERMISSION of (PluginENSSubdomainRegistrarProxy: 0xb6Cad49448c6141baAB5CD024e7Fce202E959647) for (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0xff447ad5f0b5e8ac74d0178d2169a7123cb06a5cabdf7bf2b56b5b0b86970497)
Setting 2 permissions. Skipped 0
Set permissions with 0x436366c499310c854c1a1942df6673c422b24d21b1aaccc72b6405d7c7058567. Waiting for confirmation...
Granted the REGISTER_DAO_PERMISSION of (DAORegistryProxy: 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d) for (DAOFactory: 0x8581e35c4B2f649CaCEAb02BC9e23A1F98449E38), see (tx: 0x436366c499310c854c1a1942df6673c422b24d21b1aaccc72b6405d7c7058567)
Granted the UPGRADE_REGISTRY_PERMISSION of (DAORegistryProxy: 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d) for (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0x436366c499310c854c1a1942df6673c422b24d21b1aaccc72b6405d7c7058567)
Setting 2 permissions. Skipped 0
Set permissions with 0x4c5d3604084f371fa8b544d61f8b043e0ebce192560544aba03b28f1859ac2fd. Waiting for confirmation...
Granted the REGISTER_PLUGIN_REPO_PERMISSION of (PluginRepoRegistryProxy: 0x66c7C4B7868b130Ece8eedda702808A7b37BbdaD) for (PluginRepoFactory: 0x9C1e82F3C717dF3a650E1665705c46EA2123Bc59), see (tx: 0x4c5d3604084f371fa8b544d61f8b043e0ebce192560544aba03b28f1859ac2fd)
Granted the UPGRADE_REGISTRY_PERMISSION of (PluginRepoRegistryProxy: 0x66c7C4B7868b130Ece8eedda702808A7b37BbdaD) for (ManagementDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150), see (tx: 0x4c5d3604084f371fa8b544d61f8b043e0ebce192560544aba03b28f1859ac2fd)

Verifying permissions
Permissions verified

Finalizing ManagementDao.
Setting 2 permissions. Skipped 0
Set permissions with 0xdaf1cc46cca7f0bcff73d439886a83d3a2d56999dbcf04470899cb5d636fa2ea. Waiting for confirmation...
Granted the REGISTER_DAO_PERMISSION of (DAORegistryProxy: 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0xdaf1cc46cca7f0bcff73d439886a83d3a2d56999dbcf04470899cb5d636fa2ea)
Granted the SET_METADATA_PERMISSION of (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0xdaf1cc46cca7f0bcff73d439886a83d3a2d56999dbcf04470899cb5d636fa2ea)
Registered the (managingDAO: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) on (DAORegistry: 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d), see (tx: 0x309230cf380876c1d3669ff2eb285b04ef85d1ed2f95b13466f77171b118d873)
Setting 3 permissions. Skipped 0
Set permissions with 0x574ae9483ac2d624410b6657ce6e6cf52da36d4e822f79b1635b24911d6756c6. Waiting for confirmation...
Revoked the REGISTER_DAO_PERMISSION of (DAORegistryProxy: 0x1CC5A2eD95dF30583552c166076bEE98E0cb9F6d) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x574ae9483ac2d624410b6657ce6e6cf52da36d4e822f79b1635b24911d6756c6)
Revoked the ROOT_PERMISSION of (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x574ae9483ac2d624410b6657ce6e6cf52da36d4e822f79b1635b24911d6756c6)
Revoked the SET_METADATA_PERMISSION of (ManagementDAOProxy: 0x0F2d4566Ac3689CC57CC23fC6BaBFf0Bf4c58150) for (Deployer: 0xc8541aAE19C5069482239735AD64FAC3dCc52Ca2), see (tx: 0x574ae9483ac2d624410b6657ce6e6cf52da36d4e822f79b1635b24911d6756c6)
  `;
*/

  const log = noEnslog;

  // Extract all transaction hashes from the log
  let txHashes = Array.from(log.matchAll(/tx:\s*(0x[a-fA-F0-9]{64})/g)).map(
    match => match[1]
  );

  // Remove duplicate transaction hashes
  txHashes = [...new Set(txHashes)];

  console.log(`Found ${txHashes.length} unique transactions:`);

  let totalGasUsed = ethers.BigNumber.from(0);

  for (const txHash of txHashes) {
    console.log(`Processing transaction: ${txHash}`);
    const receipt = await ethers.provider.getTransactionReceipt(txHash);

    if (receipt) {
      console.log(
        `  Gas Used: ${receipt.gasUsed.toString()} (block: ${
          receipt.blockNumber
        })`
      );
      totalGasUsed = totalGasUsed.add(receipt.gasUsed);
    } else {
      console.log(`  Warning: Could not fetch receipt for ${txHash}`);
    }
  }

  // Fetch the current gas price
  const gasPrice = await ethers.provider.getGasPrice();
  const totalCost = totalGasUsed.mul(gasPrice);

  console.log(`\nTotal Gas Used: ${totalGasUsed.toString()}`);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  console.log(
    `Total Deployment Cost: ${ethers.utils.formatEther(totalCost)} ETH`
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
