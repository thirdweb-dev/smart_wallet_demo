## Usage

Install dependencies:

```bash
npm install # npm
yarn # yarn
```

- Run the project:

```bash
npm run dev # npm
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
const chain = Goerli; // your chain: Mumbai, BaseGoerli, OptimismGoerli, etc
```

## Contract Requirements:

The script has default factories out of the box for testnets, but you can deploy your own on the [thirdweb dashboard](https://thirdweb.com/explore).
