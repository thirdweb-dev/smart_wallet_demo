import { config } from "dotenv";
import { SmartContract, ThirdwebSDK, Transaction } from "@thirdweb-dev/sdk";
import {
  getSmartWalletAddress,
  getAllSmartWallets,
  isSmartWalletDeployed,
  SmartWallet,
  SmartWalletConfig,
} from "@thirdweb-dev/wallets";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";
import { BaseGoerli, Chain, Goerli, Mumbai } from "@thirdweb-dev/chains";

config();

const chain = Goerli;
// const factoryAddress = "0xe448A5878866dD47F61C6654Ee297631eEb98966"; // old impl
const factoryAddress = "0x1EbfDd6aFbACaF5BFC877bA7111cB5f5DDabb53c"; // goerli
// const factoryAddress = "0x72a3c3c93890DE1038cf701709294E8f4D5E5A7e"; // simpleAccount factory
// const factoryAddress = "0x88d9A32D459BBc7B77fc912d9048926dEd78986B"; // base-goerli

const claimNFT = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0x884d4bf2Ca59C1b195b24d27D1050dEC165CccF6" // goerli
  );
  console.log("claiming nft");
  const tx = await contract.erc1155.claim.prepare(0, 1);
  return tx.execute();
  // console.log("claimed nft", tx.receipt.transactionHash);
};

const prepareClaimNFT = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0x884d4bf2Ca59C1b195b24d27D1050dEC165CccF6" // goerli
  );
  console.log("claiming nft");
  const tx = await contract.erc1155.claim.prepare(0, 1);
  return tx;
  // console.log("claimed nft", tx.receipt.transactionHash);
};

const prepareClaimToken = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823" // goerli
  );
  console.log("claiming token");
  const tx = await contract.erc20.claim.prepare(1);
  return tx;
  // console.log("claimed nft", tx.receipt.transactionHash);
};

const claimToken = async (sdk: ThirdwebSDK) => {
  console.time("contract");
  const contract = await sdk.getContract(
    "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823"
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

const addSigner = async (localWallet: LocalWalletNode) => {
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

const batchTransaction = async (smartWallet: SmartWallet, sdk: ThirdwebSDK) => {
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

const main = async () => {
  try {
    // Local signer
    let localWallet = new LocalWalletNode();
    await localWallet.loadOrCreate({
      strategy: "mnemonic",
      encryption: false,
    });
    const personalWalletAddress = await localWallet.getAddress();
    console.log("Local signer addr:", personalWalletAddress);

    // AA Config
    // const stackup_key = process.env.STACKUP_KEY as string;
    // const pimlico_key = process.env.PIMLICO_KEY as string;
    const pimlicoUrl = `https://bundler-lite-base-goerli.pimlico.io/rpc`;
    // const stackupBundler =
    //   "https://api.stackup.sh/v1/node/8b86aa9935d85195342ada91f1a9671348f454bdced0bc91be7828d75046591f";
    // const stackupRpc =
    //   "https://api.stackup.sh/api/v1/paymaster/8b86aa9935d85195342ada91f1a9671348f454bdced0bc91be7828d75046591f";
    const stagingUrl = `https://${chain.slug}.bundler-staging.thirdweb.com`;

    // Create the AA provider
    const config: SmartWalletConfig = {
      chain,
      gasless: true,
      factoryAddress,
      thirdwebApiKey: "",
      // bundlerUrl: pimlicoUrl,
      // paymasterUrl: pimlicoUrl,
      // factoryInfo: {
      //   createAccount: async (factory: SmartContract, owner: string) => {
      //     return factory.prepare("createAccount", [owner, accountId]);
      //   },
      //   getAccountAddress: async (factory, owner) => {
      //     return factory.call("getAddress", [owner, accountId]);
      //   },
      // },
    };

    const accounts = await getAllSmartWallets(
      chain,
      factoryAddress,
      personalWalletAddress
    );
    console.log(`Found ${accounts} accounts for local signer`, accounts);

    const isWalletDeployed = await isSmartWalletDeployed(
      chain,
      factoryAddress,
      personalWalletAddress
    );
    console.log(`Is smart wallet deployed?`, isWalletDeployed);

    const smartWallet = new SmartWallet(config);
    await smartWallet.connect({
      personalWallet: localWallet,
    });

    // now use the SDK normally
    const sdk = await ThirdwebSDK.fromWallet(smartWallet, chain);
    console.log("Smart Account addr:", await sdk.wallet.getAddress());
    console.log("balance:", (await sdk.wallet.balance()).displayValue);

    console.log("Claiming via SDK");
    await claimToken(sdk);
    await batchTransaction(smartWallet, sdk);

    console.log("Done!");
  } catch (e) {
    console.error("Something went wrong: ", await e);
  }
};

main();
