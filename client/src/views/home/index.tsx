// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';


import idl from '../../idl/autochess.json';
import { getProgram } from 'utils/program';
import useGameListStore from 'stores/useGameListStore';
import { CreateGame } from 'components/CreateGame';
import { createHash } from 'crypto';
import GameList from 'components/GameList';

export const HomeView: FC = ({ }) => {
  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text text-amber-100">
          sol autochess
        </h1>
        <h4 className="text-center text-slate-300 my-2 font-mono">
          <hr></hr>
          <br></br>
          <p>Fully on chain. No game servers. 0% rake.</p>
          <p>Powered by smart contracts on the Solana blockchain.</p>
          <br></br>
          <hr></hr>
          <br></br>

          <p>Join or create a game:</p>

        </h4>   
        <div className="text-center">
          <CreateGame />
          {/* {wallet.publicKey && <p>Public Key: {wallet.publicKey.toBase58()}</p>} */}
        </div>

        <GameList/>
      </div>
    </div>
  );
};
