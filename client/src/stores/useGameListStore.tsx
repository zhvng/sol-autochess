import create, { State } from 'zustand'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { IdlTypes, Program, ProgramAccount } from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import idl from '../idl/autochess.json';

interface GameListStore extends State {
  gameList;
  getGameList: (program: Program) => void;
  clearGameList: () => void;
}

const useGameListStore = create<GameListStore>((set, _get) => ({
  gameList: [],
  getGameList: async (program) => {
    let gameList = [];
    try {
      gameList = await program.account.game.all([{
        memcmp: {
          offset: 8,
          bytes: bs58.encode(Uint8Array.from([0])),
        }
      }]);
    } catch (e) {
      console.log(`error getting list: `, e);
    }
    set((s) => {
      s.gameList = gameList;
      console.log(`game list updated, `, gameList);
    });
  },
  clearGameList: () => {
    set((s)=>{
      s.gameList = [];
    });
  }
}));

export default useGameListStore;