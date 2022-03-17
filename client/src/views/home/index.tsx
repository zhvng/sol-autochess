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
        <h4 className="md:w-1/2 text-center text-slate-300 my-2 font-mono">
          <p>(devnet)</p>
          <hr></hr>
          <br></br>
          <p>Fully on chain. No game servers. 0% rake.</p>
          <p>Powered by smart contracts on the Solana blockchain.</p>
          <br></br>
          <hr></hr>
          <br></br>
          <p>How to play:</p>
          <br></br>
          <ul className="list-decimal inline-block text-left">
            <li>Create or join a game with your preferred wager amount</li>
            <li>At the start of the game, you draw 5 random units</li>
            <li>Place any 3 of them on your side of the board</li>
            <li>When the timer expires, the units will start fighting</li>
            <li>Player with units left standing wins the wagered sol</li>
          </ul>
          <br></br>
          <br></br>
          <hr></hr>
          <br></br>
          <p>This game involves sending multiple transactions in succession.</p>
          <br></br>
          <p>When you join a game, we create a burner wallet in the browser. We load it with a few cents, use it to pay tx fees, and send the remainder back to your main wallet after the game. </p>
          <br></br>
          <p>Dont keep funds in the burner wallet! It is stored in local storage so clearing the cache will delete it.</p>
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
