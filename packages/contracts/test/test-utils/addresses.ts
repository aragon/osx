import {ethers} from 'hardhat';

export async function addresses(length: number): Promise<string[]> {
  const signers = await ethers.getSigners();

  let addresses: string[] = [];

  for (let i = 0; i < length; i++) {
    addresses.push(signers[i].address);
  }
  return addresses;
}
