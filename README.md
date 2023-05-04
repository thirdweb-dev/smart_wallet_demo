## Usage

Install dependencies:

```bash
yarn install
```

Run the project:

```bash
yarn dev # yarn
```

## Configuration

The script runs on goerli by default, but requires a thirdweb API key.

paste your api key in your .env file:

```.env
THIRDWEB_API_KEY={{your_api_key}}
```

## Chains

The script runs on goerli by default, you can change it in `index.ts`

```ts
const chain = Goerli; // can also be: Mumbai, BaseGoerli, OptimismGoerli...
```

## Contracts

The script has default factories out of the box for testnets, but you can deploy your own on the [thirdweb dashboard](https://thirdweb.com/explore). You can also bring your own 4337 compatible factory, and adjust the the SDK to the specifics of the contract.

## Documentation

Full documentation at: [https://portal.thirdweb.com/wallet/smart-wallet](https://portal.thirdweb.com/wallet/smart-wallet)
