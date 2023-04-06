import { ERC4337EthersProvider } from "@account-abstraction/sdk";
import {
  SimpleAccountFactory__factory,
  SimpleAccount__factory,
} from "@account-abstraction/contracts";
import { ChainOrRpcUrl } from "@thirdweb-dev/sdk";
import { AbstractWallet } from "@thirdweb-dev/wallets/evm/wallets/abstract";
import { Signer } from "ethers";
import { ENTRYPOINT_ADDRESS } from "./constants";
import { getVerifyingPaymaster } from "./paymaster";
import { ProviderConfig, create4337Provider } from "./provider-utils";

export type SmartWalletConfig = {
  apiKey: string;
  gasless: boolean;
  localSigner: Signer;
  chain: ChainOrRpcUrl;
  factoryAddress: string;
  factoryAbi?: string;
  accountAbi?: string;
  entryPointAddress?: string;
};

export class SmartWallet extends AbstractWallet {
  private providerConfig: ProviderConfig;
  private aaProvider: ERC4337EthersProvider | undefined;

  constructor(config: SmartWalletConfig) {
    super();
    const bundlerUrl = `https://node.stackup.sh/v1/rpc/${config.apiKey}`;
    const paymasterUrl = `https://app.stackup.sh/api/v2/paymaster/payg/${config.apiKey}`;
    const entryPointAddress = config.entryPointAddress || ENTRYPOINT_ADDRESS;
    this.providerConfig = {
      chain: config.chain,
      localSigner: config.localSigner,
      entryPointAddress,
      bundlerUrl,
      paymasterAPI: config.gasless
        ? getVerifyingPaymaster(paymasterUrl, entryPointAddress)
        : undefined,
      factoryAddress: config.factoryAddress,
      factoryAbi: config.factoryAbi || SimpleAccountFactory__factory.abi, // TODO pass our own abi
      accountAbi: config.accountAbi || SimpleAccount__factory.abi, // TODO pass our own abi
    };
  }

  async getSigner(): Promise<Signer> {
    let provider = this.aaProvider;
    if (!provider) {
      provider = await create4337Provider(this.providerConfig);
    }
    return Promise.resolve(provider.getSigner());
  }
}
