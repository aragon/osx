const fetch = require('node-fetch');
const {ethers} = require('ethers');

const networks = require('../../../../packages/contracts/networks.json');

async function setGasOverride(provider) {
  let overrides = {};

  const feeData = await provider.getFeeData();
  const networkData = await provider.getNetwork();

  if (networkData.chainId === 137 || networkData.chainId === 80001) {
    // for polygon network
    const isTestnet = networkData.chainId === 80001;
    const ployOverride = await fetchPolygonGasFees(isTestnet);
    if (ployOverride) return ployOverride;
  }

  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    // for EIP-1559 transaction
    overrides = {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    };
  } else if (feeData.gasPrice) {
    // for legacy transaction
    overrides = {
      gasPrice: feeData.gasPrice.mul(2),
    };
  }

  return overrides;
}

async function fetchPolygonGasFees(isTestnet) {
  const fees = await (
    await fetch(isTestnet ? networks.mumbai.feesUrl : networks.polygon.feesUrl)
  ).json();

  if (fees.error) {
    console.log('polygon fee fetch error', fees.error);
    return null;
  }

  const maxPriorityFee = ethers.utils.parseUnits(
    fees.fast.maxPriorityFee.toFixed(6).toString(),
    'gwei'
  );

  const maxFeePerGas = ethers.utils.parseUnits(
    fees.fast.maxFee.toFixed(6).toString(),
    'gwei'
  );

  return {maxPriorityFeePerGas: maxPriorityFee, maxFeePerGas: maxFeePerGas};
}

module.exports = {setGasOverride};
