
# Solana Autochess Next

## Installation

```bash
npm install
# or
yarn install
```

## Compile WebAssembly
The game uses a Wasm version of the contract to simulate the battle on the frontend.

To compile the wasm client, run `npm run build-wasm`. This will create a `wasm-client/pkg` directory with the auto-generated wasm-bindgen code that lets us simulate the autochess contract.

## Run

Next, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
