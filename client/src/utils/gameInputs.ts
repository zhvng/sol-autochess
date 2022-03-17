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
  mainWalletPublicKey: Array<number>;
} 

const getStorageKey = (gamePDAKey: PublicKey, walletPubkey: PublicKey) => {
  return gamePDAKey.toBase58() + "_" + walletPubkey.toBase58();
}

export const createGameInputs = (gamePDAKey: PublicKey, walletPubkey: PublicKey) => {
    let gameInputs: GameInputs | undefined = undefined;
    const storageKey = getStorageKey(gamePDAKey, walletPubkey);
    
    if (localStorage.getItem(storageKey) === null) {
      const burnerWallet = Keypair.generate();
      const burnerWalletSecret = Array.from(burnerWallet.secretKey);
      const reveal1 = Array.from(createHash('sha256').update(uuidv4()).digest());
      const secret1 = Array.from(createHash('sha256').update(uuidv4()).digest());
      const commitment1 = Array.from(createHash('sha256').update(Buffer.from([...reveal1, ...secret1])).digest());
      const reveal2 = Array.from(createHash('sha256').update(uuidv4()).digest());
      const secret2 = Array.from(createHash('sha256').update(uuidv4()).digest());
      const commitment2 = Array.from(createHash('sha256').update(Buffer.from([...reveal2, ...secret2])).digest());
      const mainWalletPublicKey = Array.from(walletPubkey.toBytes());
      
      gameInputs = {
        burnerWalletSecret,
        commitment1, reveal1, secret1,
        commitment2, reveal2, secret2,
        mainWalletPublicKey,
      }
      localStorage.setItem(storageKey, JSON.stringify(gameInputs));
      console.log('Created and stored new reveals, commits and secrets for ', gamePDAKey.toBase58());
    } else {
      gameInputs = JSON.parse(localStorage.getItem(storageKey));
    }

    return gameInputs;
}
export const getGameInputs = (gamePDAKey: PublicKey, walletPubkey: PublicKey) => {
  let gameInputs: GameInputs | undefined = undefined;
  const storageKey = getStorageKey(gamePDAKey, walletPubkey);

  if (localStorage.getItem(storageKey) === null) {
    throw new Error('No game inputs for given combination');
  } else {
    gameInputs = JSON.parse(localStorage.getItem(storageKey));
  }

  console.log(`game inputs retreived, `, gameInputs);
  return gameInputs;
}

export const clearGameInputs = (gamePDAKey: PublicKey, walletPubkey: PublicKey) => {
    const storageKey = getStorageKey(gamePDAKey, walletPubkey);
    localStorage.removeItem(storageKey);
}