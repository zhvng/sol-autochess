import { useEffect, useState } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { getExplorerUrl } from '../utils/explorer'
import useGameListStore from 'stores/useGameListStore';
import { getProgram } from 'utils/program';
import { web3 } from '@project-serum/anchor';
import { useRouter } from 'next/router';
import { PublicKey } from '@solana/web3.js';
import { JoinGame } from './JoinGame';
import { CancelGame } from './CancelGame';
import { OpenGame } from './OpenGame';
import { useConnectionWrapper } from 'hooks/useConnectionWrapper';
import { RefreshIcon } from '@heroicons/react/solid';

const GameList = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnectionWrapper();
  
  const { gameList, getGameList } = useGameListStore();

  useEffect(()=>{
    loadAccounts();
  }, [connection, wallet]);

  const loadAccounts = () => {
    if (connection !== undefined) {
      const program = getProgram(wallet, connection);
      getGameList(program);
    }
  };

  if (gameList === undefined || gameList !== undefined && gameList.length === 0) {
    return (
      <>
        <div className='flex w-full justify-end'>
          <button onClick={loadAccounts}><RefreshIcon className='h-5 w-5'/></button>
        </div>
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
            <tr
              className={`text-slate-300 h-1 border-2 max-w-full`}
            >
              <td className='w-32 text-center'></td>
              <td className='max-w-48 w-48 min-w-48 text-center overflow-hidden overflow-ellipsis'>
              </td>
              <td className='w-1/4 text-center'></td>
              <td className='w-1/4 text-center'></td>
            </tr>
          </tbody>
        </table>
        <div>No open games. Create one above.</div>
      </>
    )
  }
  return (
  <>
    <div className='flex w-full justify-end'>
      <button onClick={loadAccounts}><RefreshIcon className='h-5 w-5'/></button>
    </div>
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
  </>
  );
}

const GameEntry = ({account, publicKey, walletPubkey}) => {
  const initializer = account.initializer.toBase58();
  const isYou = walletPubkey && walletPubkey.toBase58() === account.initializer.toBase58();
  return (
    <tr
      className={`text-slate-300 h-20 border-2 max-w-full ${isYou && 'text-red-300'}`}
    >
      <td className='w-32 text-center'>{account.wager && (account.wager / web3.LAMPORTS_PER_SOL).toFixed(3)} sol</td>
      <td className='w-48 text-center overflow-hidden overflow-ellipsis'>
        {account.initializer && isYou ? 'you' : 
          <button onClick={()=>{navigator.clipboard.writeText(initializer)}}>{initializer.slice(0,5) + '...' + initializer.slice(-4)}</button>}
      </td>
      <td className='w-1/4 text-center'>1/2</td>
      <td className='w-1/4 text-center'>{
        (walletPubkey !== undefined && walletPubkey.toBase58() === account.initializer.toBase58()) ? 
        <OpenGame gamePDAKey={publicKey as PublicKey}/>
        :
        <JoinGame gamePDAKey={publicKey as PublicKey} />
        }</td>
    </tr>
  )
}

export default GameList
