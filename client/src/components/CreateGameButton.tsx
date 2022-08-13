import { AnchorWallet, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { CreateGame } from './CreateGame';
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/solid';

export const CreateGameButton: FC = () => {
    const wallet = useAnchorWallet();
    const [isOpen, setIsOpen] = useState(false);
    function toggleCreateGame() {
        setIsOpen(!isOpen);
    }

    return (
        <React.Fragment>
            <div className='flex flex-wrap'>
                {!isOpen && <button onClick={toggleCreateGame} className='mr-4 mb-4 p-4 pr-8 w-52 bg-slate-800 rounded-lg h-fit'>
                    <div className={`place-items-center flex ${!wallet && 'text-slate-600'}`}>
                        <PlusIcon className='h-8 w-8' />
                        <div className="text-left text-lg pl-2">
                            Create Game
                        </div>
                        
                    </div>
                </button>}
                {isOpen && 
                <div className='flex-row'>
                    <CreateGame />
                </div>}
            </div>
        </React.Fragment>

    );
};
