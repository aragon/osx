const fs = require('fs');
const glob = require('glob');
const {promisify} = require('util');

const contractsDir = '../contracts/artifacts/contracts';
const abiDir = './src/abis';

const activeContracts = ['DAOFactory', 'TokenFactory', 'Registry'];

async function main() {
  try {
    const pGlob = promisify(glob);
    const deployedContractArtifacts = await pGlob(
      `${contractsDir}/**/*(${activeContracts.join('|')}).json`
    );

    deployedContractArtifacts.forEach(artifact => {
      const contract = JSON.parse(fs.readFileSync(artifact).toString());
      if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir);
      }
      fs.writeFileSync(
        `${abiDir}/${contract.contractName}.json`,
        JSON.stringify(contract.abi, null, 2)
      );
    });

    console.log('✅ Saved active contracts abis to web-app');
    return true;
  } catch (e) {
    console.log('Failed to read artifacts and generate abis and types');
    console.log(e);
    return false;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
