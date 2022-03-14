import create, { State } from 'zustand'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { IdlTypes, Program, ProgramAccount } from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import idl from '../idl/autochess.json';

interface GameStateStore extends State {
  gameState;
  getGameState: (program: Program, gamePDA: PublicKey) => void;
}

const useGameStateStore = create<GameStateStore>((set, _get) => ({
  gameState: undefined,
  getGameState: async (program, gamePDA) => {
    let gameState = undefined;
    try {
      gameState = await program.account.game.fetch(gamePDA, 'confirmed');
    } catch (e) {
      console.log(`error getting state: `, e);
    }
    set((s) => {
      s.gameState = gameState;
      console.log(`game state updated, `, gameState);
    });
  },
}));

export default useGameStateStore;