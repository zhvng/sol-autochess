// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';

// Components
import { RequestAirdrop } from '../../components/RequestAirdrop';
import pkg from '../../../package.json';

// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';

// anchor
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import {
  Idl,
  Program, Provider, web3
} from '@project-serum/anchor';

import idl from '../../idl/autochess.json';
import { getProgram } from 'utils/program';
import useGameListStore from 'stores/useGameListStore';
import { CreateGame } from 'components/CreateGame';
import { createHash } from 'crypto';
import GameList from 'components/GameList';

export const HomeView: FC = ({ }) => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const program = getProgram(wallet, connection);

  const balance = useUserSOLBalanceStore((s) => s.balance);
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  // Note: Burner wallets are stored in local storage.
  // They are relatively insecure and you should avoid 
  // storing substantial funds in them.
  
  // Also, clearing browser local storage/cache will render your
  // burner wallets inaccessible, unless you export your private keys.
  
  useEffect(() => {
    if (wallet !== undefined && wallet.publicKey !== undefined) {
      console.log('main wallet: ', wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet, connection, getUserSOLBalance])

  useEffect(() => {
  }, [])

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text text-amber-100">
          sol autochess
        </h1>
        <h4 className="md:w-1/2 text-center text-slate-300 my-2 font-mono">
          <hr></hr>
          <br></br>
          <p>Fully on chain. No game servers. 0% rake.</p>
          <p>Powered by smart contracts on the Solana blockchain.</p>
          <br></br>
          <hr></hr>
          <br></br>
          <p>How it works:</p>
          <br></br>
          <ol className="inline-block text-left">
            <li>1. Create or join a game with your preferred wager amount</li>
            <li>2. At the start of the game, you draw 5 random units</li>
            <li>3. Place any 3 of them on your side of the board</li>
            <li>4. When the timer expires, the units will start fighting</li>
            <li>5. Player with units left standing wins the wagered sol</li>
          </ol>
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
          {wallet && <p>SOL Balance: {(balance || 0).toLocaleString()}</p>}
        </div>

        <GameList/>
      </div>
    </div>
  );
};
