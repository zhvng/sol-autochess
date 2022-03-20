
# Solana Autochess Next

## Installation

```bash
npm install
# or
yarn install
```

## Compile WebAssembly
The game uses a Wasm version of the contract to simulate the battle on the frontend.

To compile the contract, run `npm run build-wasm`. This will create a `pkg/` directory that contains the auto-generated wasm-bindgen code. The code that interfaces with the wasm is located in the `wasm-client` directory.

## Run

Next, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
