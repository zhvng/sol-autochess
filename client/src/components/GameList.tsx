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
import { RefreshIcon, PuzzleIcon } from '@heroicons/react/solid';

const GameList = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnectionWrapper();
  
  const { gameList, getGameList } = useGameListStore();

  useEffect(()=>{
    loadAccounts();
  }, [connection, wallet]);

  const loadAccounts = () => {
    if (connection !== undefined && wallet !== undefined) {
      const program = getProgram(wallet, connection);
      getGameList(program);
    }
  };

  const gameListEmpty = (gameList === undefined || gameList !== undefined && gameList.length === 0)
    
  return (
  <>
    <div className='flex w-full flex-row mt-4'>
      <h2 className='text-lg flex-auto'>
        Open Games
      </h2>
      <div className='justify-end'>
        <button onClick={loadAccounts} className='align-middle'><RefreshIcon className='h-5 w-5'/></button>
      </div>
    </div>
    {!gameListEmpty ? (
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
      </table>)
      : (
        <div className='place-items-center w-full p-8'>
          
          <div className='mx-auto w-full text-center border-slate-600 border-2 p-4 rounded-lg'>
            <div className='text-slate-600'>
              No open games. Create one above.
            </div>

          </div>
        </div>
      )}
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
