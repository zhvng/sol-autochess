// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Components
import { RequestAirdrop } from '../../components/RequestAirdrop';
import pkg from '../../../package.json';

// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';

// anchor
import idl from '../../idl/autochess.json';
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';

export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  const [burnerWallet, setBurnerWallet] = useState<Keypair>(undefined);
  // AwrQQpL4QssWCUCjqrmZ1uySFGBR32jhhhSwm7A57tcS

  // Note: Burner wallets are stored in local storage.
  // They are relatively insecure and you should avoid 
  // storing substantial funds in them.
  
  // Also, clearing browser local storage/cache will render your
  // burner wallets inaccessible, unless you export your private keys.
  
  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])

  useEffect(() => {

    if (localStorage.getItem('burner') === null) {
      const keypair = Keypair.generate();
      localStorage.setItem('burner', JSON.stringify(Array.from(keypair.secretKey)));
      setBurnerWallet(keypair);
    } else {
      const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(localStorage.getItem('burner'))));
      setBurnerWallet(keypair);
    }
    console.log(burnerWallet)
  }, [])

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text text-amber-100">
          dAutochess <span className='text-sm font-normal align-top text-slate-700'>v{pkg.version}</span>
        </h1>
        <h4 className="md:w-full text-center text-slate-300 my-2">
          <p>Fully on chain. No game servers.</p>
          Verifiable outcomes on the Solana blockchain. 
          burner wallet: {burnerWallet && burnerWallet.publicKey.toString()}
        </h4>
        <div className="max-w-md mx-auto mockup-code bg-primary p-6 my-2">
          <pre data-prefix=">">
            <code className="truncate">Start building on Solana  </code>
          </pre>
        </div>        
          <div className="text-center">
          <RequestAirdrop />
          {/* {wallet.publicKey && <p>Public Key: {wallet.publicKey.toBase58()}</p>} */}
          {wallet && <p>SOL Balance: {(balance || 0).toLocaleString()}</p>}
        </div>
      </div>
    </div>
  );
};
