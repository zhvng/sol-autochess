import { useEffect, useState } from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { getExplorerUrl } from '../utils/explorer'
import useGameListStore from 'stores/useGameListStore';
import { getProgram } from 'utils/program';
import { web3 } from '@project-serum/anchor';
import { useRouter } from 'next/router';
import { PublicKey } from '@solana/web3.js';
import { JoinGame } from './JoinGame';
import { CancelGame } from './CancelGame';

const GameList = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  
  const { gameList, getGameList } = useGameListStore();

  useEffect(()=>{
    const program = getProgram(wallet, connection);
    getGameList(program);
  }, []);

  if (gameList === undefined || gameList !== undefined && gameList.length === 0) {
    return (
      <div>No open games. Create one above.</div>
    )
  }
  return (
  <table className="table-fixed">
    <thead>
      <tr>
        <th>Wager</th>
        <th>Initializer</th>
        <th>Players</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {gameList.map((n, idx) => (
        <GameEntry
          key={`${idx}`}
          account={n.account}
          publicKey={n.publicKey as PublicKey}
          walletPubkey={wallet ? wallet.publicKey as PublicKey: undefined}
        />
      ))}
    </tbody>
  </table>
  );
}

const GameEntry = ({account, publicKey, walletPubkey}) => {
  const isYou = walletPubkey && walletPubkey.toBase58() === account.initializer.toBase58();
  return (
    <tr
      className={`text-slate-300 h-20 border-2 max-w-full ${isYou && 'text-red-300'}`}
    >
      <td className='w-28 text-center'>{account.wager && (account.wager / web3.LAMPORTS_PER_SOL).toFixed(3)} sol</td>
      <td className='max-w-[150px] min-w-[150px] text-center overflow-hidden overflow-ellipsis'>
        {account.initializer && isYou ? 'you' : account.initializer.toBase58()}
      </td>
      <td className='w-1/4 text-center'>1/2</td>
      <td className='w-1/4 text-center'>{
        (walletPubkey !== undefined && walletPubkey.toBase58() === account.initializer.toBase58()) ? 
        <CancelGame gamePDAKey={publicKey as PublicKey}/>
        :
        <JoinGame gamePDAKey={publicKey as PublicKey} />
        }</td>
    </tr>
  )
}

export default GameList
