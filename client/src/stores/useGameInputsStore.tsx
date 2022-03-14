import create, { State } from 'zustand'
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js'
import { IdlTypes, Program, ProgramAccount } from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import idl from '../idl/autochess.json';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type GameInputs = {
  commitment1: Array<number>;
  reveal1: Array<number>;
  secret1: Array<number>;
  commitment2: Array<number>;
  reveal2: Array<number>;
  secret2: Array<number>;
  burnerWalletSecret: Array<number>;
} 

interface GameInputsStore extends State {
  gameInputs: GameInputs | undefined;
  getGameInputs: (gamePDAKey: PublicKey, walletPubkey: PublicKey) => GameInputs;
  clearGameInputs: (gamePDAKey: PublicKey, walletPubkey: PublicKey) => void;
}

const useGameInputsStore = create<GameInputsStore>((set, _get) => ({
  gameInputs: undefined,
  getGameInputs: (gamePDAKey, walletPubkey) => {
    let gameInputs: GameInputs | undefined = undefined;
    const storageKey = gamePDAKey.toBase58() + "_" + walletPubkey.toBase58();
    try {
      if (localStorage.getItem(storageKey) === null) {
        const burnerWallet = Keypair.generate();
        const burnerWalletSecret = Array.from(burnerWallet.secretKey);
        const reveal1 = Array.from(createHash('sha256').update(uuidv4()).digest());
        const secret1 = Array.from(createHash('sha256').update(uuidv4()).digest());
        const commitment1 = Array.from(createHash('sha256').update(Buffer.from([...reveal1, ...secret1])).digest());
        const reveal2 = Array.from(createHash('sha256').update(uuidv4()).digest());
        const secret2 = Array.from(createHash('sha256').update(uuidv4()).digest());
        const commitment2 = Array.from(createHash('sha256').update(Buffer.from([...reveal2, ...secret2])).digest());

        gameInputs = {
          burnerWalletSecret,
          commitment1, reveal1, secret1,
          commitment2, reveal2, secret2,
        }
        localStorage.setItem(storageKey, JSON.stringify(gameInputs));
        console.log('Created and stored new reveals, commits and secrets for ', gamePDAKey.toBase58());
      } else {
        gameInputs = JSON.parse(localStorage.getItem(storageKey));
      }
    } catch (e) {
      console.log(`error getting game inputs: `, e);
    }
    set((s) => {
      s.gameInputs = gameInputs;
      console.log(`game inputs retreived, `, gameInputs);
    });
    return gameInputs;
  },
  clearGameInputs: (gamePDAKey, walletPubkey) => {
    const storageKey = gamePDAKey.toBase58() + "_" +  walletPubkey.toBase58();
    localStorage.removeItem(storageKey);
    set((s)=>{
      s.gameInputs = undefined;
    });
  }
}));

export default useGameInputsStore;