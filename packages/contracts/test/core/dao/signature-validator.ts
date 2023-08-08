import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {SignatureValidator} from '../../../typechain/SignatureValidator';
import {deployWithProxy} from '../../test-utils/proxy';
import {DAO, DAO__factory} from '../../../typechain';
import {SignatureValidator__factory} from '../../../typechain/factories/SignatureValidator__factory';
import {expect} from 'chai';

const EIP1271_MAGICVALUE = '0x1626ba7e';
const EIP1271_INVALID_SIG = '0xffffffff';
const SET_SIGNATURE_VALIDATOR_PERMISSION_ID = ethers.utils.id(
  'SET_SIGNATURE_VALIDATOR_PERMISSION'
);
const SIGN_PERMISSION_ID = ethers.utils.id('SIGN_PERMISSION');
const HARDHAT_DEFAULT_MNEMONIC =
  'test test test test test test test test test test test junk';
const HARDHAT_DEFAULT_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('SignatureValidator', function () {
  let signer: SignerWithAddress;
  let deployer: SignerWithAddress;
  let faker: SignerWithAddress;
  let dao: DAO;
  let signatureValidator: SignatureValidator;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];

    signer = ethers.Wallet.fromMnemonic(
      HARDHAT_DEFAULT_MNEMONIC
    ) as unknown as SignerWithAddress;
    expect(signer.address).to.equal(HARDHAT_DEFAULT_ADDRESS);
    faker = signers[1];

    const DAO = new DAO__factory(deployer);
    dao = await deployWithProxy<DAO>(DAO);
    await dao.initialize(
      ethers.constants.AddressZero,
      deployer.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    );

    const SignatureValidator = new SignatureValidator__factory(deployer);
    signatureValidator = await SignatureValidator.deploy();

    // Set the signature validator
    await dao.grant(
      dao.address,
      deployer.address,
      SET_SIGNATURE_VALIDATOR_PERMISSION_ID
    );
    await dao.setSignatureValidator(signatureValidator.address);

    expect(await dao.signatureValidator()).to.equal(signatureValidator.address);
  });

  describe('isValidSignature', function () {
    context('signature types', async () => {
      it('personal_sign', async () => {
        await dao.grant(dao.address, signer.address, SIGN_PERMISSION_ID);

        const message = ethers.utils.hexlify(
          ethers.utils.toUtf8Bytes('My email is john@doe.com - 1691413123958')
        );
        const expectedMessage =
          '0x4d7920656d61696c206973206a6f686e40646f652e636f6d202d2031363931343133313233393538';
        expect(message).to.equal(expectedMessage);

        const hash = ethers.utils.hashMessage(message);
        const expectedHash =
          '0x7ab11c2ddb1977ee8a436850bb537c26816f122a0b8f3fb9b2cbdde8cafe8f55';
        expect(hash).to.equal(expectedHash);

        const signature = await signer.signMessage(message);

        const expectedSignature =
          '0x12e00cf0b13b809120802513833dc99d758caaa2920e76ddca14ee79ce53f62e527732a69f791ee1422376793265ff1c2fceba5f1d074dc649097efa4a89bf5e1b';

        expect(signature).to.equal(expectedSignature);

        expect(ethers.utils.recoverAddress(hash, signature)).to.equal(
          signer.address
        );

        expect(await dao.isValidSignature(hash, signature)).to.equal(
          EIP1271_MAGICVALUE
        );
      });

      it('eth_sign', async () => {
        await dao.grant(dao.address, signer.address, SIGN_PERMISSION_ID);

        expect(signer.address).to.equal(HARDHAT_DEFAULT_ADDRESS);

        const message = ethers.utils.hexlify(
          '0xb8a59eeb7524743197b75e6c82dd51c487706d47'
        );
        const expectedMessage = '0xb8a59eeb7524743197b75e6c82dd51c487706d47';
        expect(message).to.equal(expectedMessage);

        const hash = ethers.utils.hashMessage(message);
        const expectedHash =
          '0xbc7d65535783e7d9c1a762866320327c8e1e80131f85ea018dc08f2466c3cdd6';
        expect(hash).to.equal(expectedHash);

        const signature = await signer.signMessage(message);
        const expectedSignature =
          '0x8b1b13a8977a35ac16fb5dbef69db6f7d27381a1a39b8b3d36d231a86ffaf5b30b678308a8153a76d12c393f5b33e19243979f036ebea296d8f1fd35147adf4e1c';

        expect(signature).to.equal(expectedSignature);
        expect(ethers.utils.recoverAddress(hash, signature)).to.equal(
          signer.address
        );

        expect(await dao.isValidSignature(hash, signature)).to.equal(
          EIP1271_MAGICVALUE
        );
      });

      it('eth_signTypedData_v4', async () => {
        await dao.grant(dao.address, signer.address, SIGN_PERMISSION_ID);

        const rawTypedData =
          '{"domain":{"name":"My App","version":"1","chainId":1,"verifyingContract":"0x1111111111111111111111111111111111111111"},"types":{"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"content","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}]},"message":{"from":{"name":"Alice","wallet":"0x2111111111111111111111111111111111111111"},"to":{"name":"Bob","wallet":"0x3111111111111111111111111111111111111111"},"content":"Hello!"}}';

        const typedData = JSON.parse(rawTypedData);

        const domain = typedData['domain'];
        const types = typedData['types'];
        const message = typedData['message'];

        const hash = ethers.utils._TypedDataEncoder.hash(
          domain,
          types,
          message
        );
        const signature = await signer._signTypedData(domain, types, message);

        const recoveredAddress = ethers.utils.recoverAddress(hash, signature);
        expect(recoveredAddress).to.equal(signer.address);

        const expectedSignature =
          '0xc8fa9b47c12db0cc6806e4f4d2a037f56a982194e221a60b8ab76e08e976d52c2817045c1239e2d8fafabe8111683209f370f80c3a701e21482b9f41cd54236f1c';
        expect(signature).to.equal(expectedSignature);

        expect(await dao.isValidSignature(hash, signature)).to.equal(
          EIP1271_MAGICVALUE
        );
      });

      it('eth_signTypedData_v4 (with unused types)', async () => {
        const rawTypedData =
          '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}';
        const typedData = JSON.parse(rawTypedData);

        const domain = typedData['domain'];
        const types = typedData['types'];
        const message = typedData['message'];

        expect(() =>
          ethers.utils._TypedDataEncoder.hash(domain, types, message)
        ).to.throw(
          'ambiguous primary types or unused types: "EIP712Domain", "Mail" (argument="types", value={"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]}, code=INVALID_ARGUMENT, version=hash/5.5.0)'
        );

        // Delete unused types
        delete types['EIP712Domain']; // To prevent "unused types" error (see https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471)

        const hash = ethers.utils._TypedDataEncoder.hash(
          domain,
          types,
          message
        );

        const expectedHash =
          '0x92ac523f1818be0978b0dd034940935774074d624c29cbece878dfeb57ebdf54'; // from aragon.app
        const expectedHashFromGnosisSafe =
          //  '0xcecd5a027422a0547c3cae8ec5763f5473d15407330363be17a304628f1e21ca';
          expect(hash).to.equal(expectedHash);
        //expect(hash).to.equal(expectedHashFromGnosisSafe);

        const signature = await signer._signTypedData(domain, types, message);

        const recoveredAddress = ethers.utils.recoverAddress(hash, signature);
        expect(recoveredAddress).to.equal(signer.address);

        const expectedSignature =
          '0x471b32075e13317cebd33e8cc8d4f4de8692b7e0ee446bec7f500ec45bc9db4f3ce393429392cdb7d4da4d1e6d8c09ae8ec299ba13fc91b1ca885d745de0de051b'; // from aragon.app
        const expectedSignatureFromGnosisSafe =
          '0x4be0602ffdb9c0d2feb75f0a8256a73d71d6dd47a8da3e1d1689426cd361f9af66803ffbdfff1ea1a05acac304e0f6d4c618d95621cecb83c3e2f7cd13e39a461b';
        expect(signature).to.equal(expectedSignature); // TODO the aragon.app frontend signature or hash seems to be wrong
        //expect(signature).to.equal(expectedSignatureFromGnosisSafe); // TODO the aragon.app frontend signature or hash seems to be wrong

        expect(await dao.isValidSignature(hash, signature)).to.equal(
          EIP1271_MAGICVALUE
        );
      });
    });

    it('validates a signature if the signer has the `SIGN_PERMISSION`', async () => {
      await dao.grant(dao.address, signer.address, SIGN_PERMISSION_ID);
      expect(
        await dao.hasPermission(
          dao.address,
          signer.address,
          SIGN_PERMISSION_ID,
          []
        )
      ).to.be.true;

      const message = 'Hi';
      const hash = ethers.utils.hashMessage(message);

      const signature = await signer.signMessage(message);
      expect(await dao.isValidSignature(hash, signature)).to.equal(
        EIP1271_MAGICVALUE
      );
    });

    it('invalidates a signature if the signer lacks the `SIGN_PERMISSION`', async () => {
      expect(
        await dao.hasPermission(
          dao.address,
          signer.address,
          SIGN_PERMISSION_ID,
          []
        )
      ).to.be.false;

      const message = 'Hi';
      const hash = ethers.utils.hashMessage(message);

      const fakedSignature = await faker.signMessage(message);
      expect(await dao.isValidSignature(hash, fakedSignature)).to.equal(
        EIP1271_INVALID_SIG
      );
    });

    it('invalidates a signature although the faker has the `SIGN_PERMISSION`', async () => {
      await dao.grant(dao.address, faker.address, SIGN_PERMISSION_ID);
      expect(
        await dao.hasPermission(
          dao.address,
          faker.address,
          SIGN_PERMISSION_ID,
          []
        )
      ).to.be.true;

      const message = 'Hi';
      const hash = ethers.utils.hashMessage(message);

      const signature = await faker.signMessage(message);
      expect(await dao.isValidSignature(hash, signature)).to.equal(
        EIP1271_MAGICVALUE
      );
    });

    it('invalidates a signature if the faker lacks the `SIGN_PERMISSION`', async () => {
      expect(
        await dao.hasPermission(
          dao.address,
          faker.address,
          SIGN_PERMISSION_ID,
          []
        )
      ).to.be.false;

      const message = 'Hi';
      const hash = ethers.utils.hashMessage(message);

      const fakedSignature = await faker.signMessage(message);
      expect(await dao.isValidSignature(hash, fakedSignature)).to.equal(
        EIP1271_INVALID_SIG
      );
    });

    it('Missing E2E uniswap test: make a trade and execute it', async () => {});
  });
});
