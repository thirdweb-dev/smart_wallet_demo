import { ChainOrRpcUrl } from "@thirdweb-dev/sdk";
import { AbstractWallet } from "@thirdweb-dev/wallets/evm/wallets/abstract";
import { Signer } from "ethers";
import { ENTRYPOINT_ADDRESS } from "./constants";
import { getVerifyingPaymaster } from "./paymaster";
import { ProviderConfig, create4337Provider } from "./provider-utils";

import TWAccountFactory from "../artifacts/TWAccountFactory.json";
import TWAccount from "../artifacts/TWAccount.json";
import { ERC4337EthersProvider } from "./erc4337-provider";

export type SmartWalletConfig = {
  apiKey: string;
  gasless: boolean;
  chain: ChainOrRpcUrl;
  factoryAddress: string;
  factoryAbi?: string;
  accountAbi?: string;
  entryPointAddress?: string;
};

export class SmartWallet extends AbstractWallet {
  static fromLocalWallet(
    config: SmartWalletConfig,
    localSigner: Signer,
    accountId: string
  ): SmartWallet {
    const wallet = new SmartWallet(config);
    wallet.connect(localSigner, accountId);
    return wallet;
  }

  private config: SmartWalletConfig;
  private providerConfig: ProviderConfig | undefined;
  private aaProvider: ERC4337EthersProvider | undefined;

  constructor(config: SmartWalletConfig) {
    super();
    this.config = config;
  }

  connect(localSigner: Signer, accountId: string) {
    const config = this.config;
    const bundlerUrl = `https://node.stackup.sh/v1/rpc/${config.apiKey}`;
    const paymasterUrl = `https://app.stackup.sh/api/v2/paymaster/payg/${config.apiKey}`;
    const pimlicoUrl = `https://api.pimlico.io/v1/goerli/rpc?apikey=${config.apiKey}`;
    const entryPointAddress = config.entryPointAddress || ENTRYPOINT_ADDRESS;
    this.providerConfig = {
      chain: config.chain,
      localSigner,
      accountId,
      entryPointAddress,
      bundlerUrl: pimlicoUrl,
      paymasterAPI: config.gasless
        ? getVerifyingPaymaster(pimlicoUrl, entryPointAddress)
        : undefined,
      factoryAddress: config.factoryAddress,
      factoryAbi: config.factoryAbi || TWAccountFactory.abi,
      accountAbi: config.accountAbi || TWAccount.abi,
    };
  }

  async getSigner(): Promise<Signer> {
    if (!this.providerConfig) {
      throw new Error("Local Signer not connected");
    }
    let provider = this.aaProvider;
    if (!provider) {
      provider = await create4337Provider(this.providerConfig);
    }
    return Promise.resolve(provider.getSigner());
  }
}
