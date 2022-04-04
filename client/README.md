
# Solana Autochess Next

## Installation

```bash
npm install
# or
yarn install
```

## Compile WebAssembly
The game uses a Wasm version of the contract to simulate the battle on the frontend.

For this you will need to install Rust and wasm-pack (https://www.rust-lang.org/tools/install, https://rustwasm.github.io/wasm-pack/installer/).


To compile the wasm client, run `npm run build-wasm`. This will create a `wasm-client/pkg` directory with the auto-generated wasm-bindgen code that lets us simulate the autochess contract.

## Run

To run the development server:

```bash
# for localnet
npm run local
# for devnet
npm run dev
```




Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
