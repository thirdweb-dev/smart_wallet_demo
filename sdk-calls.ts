import { Goerli } from "@thirdweb-dev/chains";
import {
  ChainOrRpcUrl,
  ThirdwebSDK,
  TransactionError,
} from "@thirdweb-dev/sdk";
import { SmartWallet, getSmartWalletAddress } from "@thirdweb-dev/wallets";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";

export const prepareClaimNFT = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0x884d4bf2Ca59C1b195b24d27D1050dEC165CccF6" // goerli
  );
  console.log("claiming nft");
  const tx = await contract.erc1155.claim.prepare(0, 1);
  return tx;
};

export const prepareClaimToken = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823" // goerli
  );
  console.log("claiming token");
  const tx = await contract.erc20.claim.prepare(1);
  return tx;
};

export const claimToken = async (sdk: ThirdwebSDK) => {
  console.time("contract");
  const contract = await sdk.getContract(
    "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823" // goerli
  );
  console.timeEnd("contract");

  const tokenBalance = await contract.erc20.balance();
  console.log("token balance:", tokenBalance.displayValue);
  console.time("claim");
  console.time("prepare");
  const tx = await contract.erc20.claim.prepare(1);

  console.timeEnd("prepare");
  console.time("send");
  const t = await tx.send();
  console.timeEnd("send");
  console.log("op sent", t.hash);
  console.time("wait for confirmation");
  const receipt = await t.wait();
  console.timeEnd("wait for confirmation");
  console.timeEnd("claim");
  console.log("claimed", receipt.transactionHash);
};

export const claimERC721Token = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0xEA763fE334a53444671BaD44FE0E033ccae4187A" // optimism-goerli
  );
  const tx = await contract.erc721.claim(1);
  console.log("claimed", tx[0].receipt.transactionHash);
};

export const playCatAttack = async (
  sdk: ThirdwebSDK,
  personalWalletAddress: string
) => {
  const contract = await sdk.getContract(
    "0xDDB6DcCE6B794415145Eb5cAa6CD335AEdA9C272" // base-goerli
  );
  const balance = await contract.erc1155.balance(0);
  if (balance.gt(0)) {
    console.log("kitten already claimed, transfering");
    await contract.erc1155.transfer(personalWalletAddress, 0, 1);
    return;
  }
  const balance1 = await contract.erc1155.balance(1);
  if (balance1.gt(0)) {
    console.log("Grumpy cat, burning");
    await contract.erc1155.burn(1, 1);
    return;
  }
  const balance2 = await contract.erc1155.balance(2);
  if (balance2.gt(0)) {
    try {
      console.log("Ninja cat, attacking");
      await contract.call("attack", [personalWalletAddress]);
    } catch (e) {
      console.log((e as TransactionError)?.reason);
    }
    return;
  }
  console.log("claiming kitten");
  const tx = await contract.call("claimKitten");
  console.log("claimed kitten", tx.receipt.transactionHash);
};

export const addSigner = async (
  chain: ChainOrRpcUrl,
  factoryAddress: string,
  localWallet: LocalWalletNode
) => {
  let localWallet2 = new LocalWalletNode({
    chain: Goerli,
    storageJsonFile: "wallet-2.json",
  });
  await localWallet2.loadOrCreate({
    strategy: "mnemonic",
    encryption: false,
  });
  const accountId2 = await localWallet2.getAddress();
  console.log("OTHER signer addr:", accountId2);

  const sdk2 = await ThirdwebSDK.fromWallet(localWallet, chain);
  console.log(
    "local signer balance:",
    (await sdk2.wallet.balance()).displayValue,
    "ETH"
  );
  const smartWalletAddress = await getSmartWalletAddress(
    chain,
    factoryAddress,
    await localWallet.getAddress()
  );
  const account = await sdk2.getContract(smartWalletAddress);
  await account.roles.grant("signer", accountId2);
  console.log(
    "added",
    accountId2,
    "as signer to smart wallet:",
    smartWalletAddress
  );
};

export const batchTransaction = async (
  smartWallet: SmartWallet,
  sdk: ThirdwebSDK
) => {
  console.log("batching transactions...");
  const batchedTx = await smartWallet.executeBatch([
    await prepareClaimToken(sdk),
    await prepareClaimNFT(sdk),
  ]);
  console.log(
    "Batched transaction succesful",
    batchedTx.receipt.transactionHash
  );
};
