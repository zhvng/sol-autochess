import create, { State } from 'zustand'
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js'
import { IdlTypes, Program, ProgramAccount } from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import idl from '../idl/autochess.json';

interface BurnerWalletStore extends State {
  burnerWallet: Keypair | undefined;
  getBurnerWallet: () => void;
}

const useBurnerWalletStore = create<BurnerWalletStore>((set, _get) => ({
  burnerWallet: undefined,
  getBurnerWallet: async () => {
    let burnerWallet = undefined;
    try {
      if (localStorage.getItem('burner') === null) {
        const keypair = Keypair.generate();
        localStorage.setItem('burner', JSON.stringify(Array.from(keypair.secretKey)));
        burnerWallet = keypair;
      } else {
        const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(localStorage.getItem('burner'))));
        burnerWallet = keypair;
      }
    } catch (e) {
      console.log(`error getting burner wallet: `, e);
    }
    set((s) => {
      s.burnerWallet = burnerWallet;
      console.log(`burner wallet retreived: `, burnerWallet);
    });
  },
}));

export default useBurnerWalletStore;