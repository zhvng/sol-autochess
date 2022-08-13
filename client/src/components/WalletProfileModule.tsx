import { AnchorWallet, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { CreateGame } from './CreateGame';
import { PlusIcon, ChevronDownIcon, UserCircleIcon } from '@heroicons/react/solid';
import useUserSOLBalanceStore from 'stores/useUserSOLBalanceStore';
import { useConnectionWrapper } from 'hooks/useConnectionWrapper';
import { RequestAirdrop } from './RequestAirdrop';

export const WalletProfileModule: FC = () => {
    const wallet = useAnchorWallet();
    const [isOpen, setIsOpen] = useState(false);
    function toggleCreateGame() {
        setIsOpen(!isOpen);
    }

    const balance = useUserSOLBalanceStore(s => s.balance);
    const { connection } = useConnectionWrapper();
    const { getUserSOLBalance } = useUserSOLBalanceStore();
    
    useEffect(() => {
      if (wallet !== undefined && wallet.publicKey !== undefined) {
        console.log('main wallet: ', wallet.publicKey.toBase58())
        getUserSOLBalance(wallet.publicKey, connection)
      }
    }, [wallet, connection, getUserSOLBalance])

    return (
        <React.Fragment>
            <div onClick={toggleCreateGame} className='w-full rounded-lg'>
                <div className={`place-items-center ${!wallet && 'text-slate-600'}`}>
                    {wallet && wallet.publicKey && 
                        <div className="">
                            <div className='flex place-items-center font-mono text-slate-400'>
                            {wallet.publicKey.toBase58().slice(0, 6)}..{wallet.publicKey.toBase58().slice(-6)}
                            </div>
                            <div className='flex place-items-center font-mono'>
                            Balance: {balance} sol 
                                <div className='mx-8'>
                                    {balance < 1 && wallet && <RequestAirdrop></RequestAirdrop>}
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </React.Fragment>

    );
};
