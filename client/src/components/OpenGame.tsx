import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, SystemProgram, Transaction, TransactionInstruction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import { getProgram } from 'utils/program';
import { notify } from "../utils/notifications";
import * as anchor from "@project-serum/anchor";

export const OpenGame = ({gamePDAKey}) => {
    const wallet = useAnchorWallet();

    const onClick = useCallback(async () => {
        if (!wallet) {
            notify({ type: 'error', message: `Wallet not connected!` });
            console.log('error', `Cancel Game: Wallet not connected!`);
            return;
        }
        window.location.href = `/play/${gamePDAKey.toBase58()}`;
    }, [wallet, notify]);

    return (
        <div>
            <button
                className="hover:bg-slate-500 btn animate disabled:animate-none border-2 p-1 px-3"
                onClick={onClick} disabled={!wallet}
            >
                <div className="hidden group-disabled:block ">
                    Wallet not connected
                </div>
                <span className="block group-disabled:hidden text-green-300" > 
                    open
                </span>
            </button>
            <br></br>
        </div>
    );
};
