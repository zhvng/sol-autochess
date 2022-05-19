import { AnchorWallet, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback, useEffect, useState } from 'react';
import useBurnerWalletStore from 'stores/useBurnerWalletStore';
import { getProgram } from 'utils/program';
import { notify } from "../utils/notifications";
import * as anchor from "@project-serum/anchor";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import { clearGameInputs, createGameInputs } from 'utils/gameInputs';
import useUserSOLBalanceStore from 'stores/useUserSOLBalanceStore';
import { useConnectionWrapper } from 'hooks/useConnectionWrapper';
import { RequestAirdrop } from './RequestAirdrop';

export const CreateGame: FC = () => {
    const wallet = useAnchorWallet();
    const { connection } = useConnectionWrapper();

    const [wagerSize, setWagerSize] = useState<number>(0.1);
    const balance = useUserSOLBalanceStore((s) => s.balance);
    const { getUserSOLBalance } = useUserSOLBalanceStore();
    
    useEffect(() => {
      if (wallet !== undefined && wallet.publicKey !== undefined) {
        console.log('main wallet: ', wallet.publicKey.toBase58())
        getUserSOLBalance(wallet.publicKey, connection)
      }
    }, [wallet, connection, getUserSOLBalance])

    const onClick = useCallback(async () => {
        if (!wallet) {
            notify({ type: 'error', message: `Wallet not connected!` });
            console.log('error', `Create Game: Wallet not connected!`);
            return;
        }

        if (wagerSize <= 0) {
            notify({ type: 'error', message: `Wager size cannot be 0` });
            console.log('error', `Create Game: Invalid wager size!`);
            return;
        }

        const program = getProgram(wallet, connection);
        const randomGameId = uuidv4().slice(0,16);
        const gamePDA = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from(randomGameId),
                Buffer.from('Game'),
            ],
            program.programId
        );
        const gamePDAKey = gamePDA[0];

        let signature = '';
        try {
            const gameInputs = createGameInputs(gamePDAKey, wallet.publicKey);
            const burnerWallet = Keypair.fromSecretKey(Uint8Array.from(gameInputs.burnerWalletSecret));

            const topUpBurnerWalletIx: TransactionInstruction = SystemProgram.transfer({
                fromPubkey: program.provider.wallet.publicKey,
                toPubkey: burnerWallet.publicKey,
                lamports: Math.floor(anchor.web3.LAMPORTS_PER_SOL / 1000), // .001 sol to cover tx fees
            });

            const wagerLamports = wagerSize*anchor.web3.LAMPORTS_PER_SOL;
            signature = await program.rpc.createGame(
                randomGameId, 
                burnerWallet.publicKey.toBytes(),
                new anchor.BN(wagerLamports), 
                Uint8Array.from(gameInputs.commitment1), 
                Uint8Array.from(gameInputs.commitment2), 
                {
                    accounts: {
                        game: gamePDAKey,
                        initializer: program.provider.wallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    },
                    postInstructions: [
                        topUpBurnerWalletIx
                    ]
                }
            );

            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            window.location.href = `/play/${gamePDAKey.toBase58()}`;
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            clearGameInputs(gamePDAKey, wallet.publicKey);
            return;
        }
    }, [wallet, notify, connection, wagerSize]);

    return (
        <div>
            <div className={`border-slate-600 border-2 p-3 rounded-lg ${!wallet && 'text-slate-600'}`}>
                Wager <input type="number" 
                value={wagerSize} 
                onChange={(e)=>{
                    const value = Math.round( e.target.valueAsNumber * 1e2 ) / 1e2;
                    if (value >= 0) {
                        setWagerSize(value)
                    }
                }}
                min="0" 
                step="0.05" 
                className='bg-slate-600 w-[75px] h-10 rounded-md p-2'></input> sol
            {wallet && <p className="text-slate-300 text-xs">balance: {(balance || 0).toLocaleString()} sol</p>}
            <button
                className="block mx-auto group w-60 mt-2 btn animate disabled:animate-none bg-slate-600"
                onClick={onClick} disabled={!wallet || balance === 0}
            >
                <div className="hidden group-disabled:block ">
                    {balance === 0 && wallet ? "Insufficient funds" : "Wallet not connected"}
                </div>
                <span className="block group-disabled:hidden" > 
                    Create Game
                </span>
            </button>
            {balance === 0 && wallet && <RequestAirdrop></RequestAirdrop>}
            </div>

            <br></br>
        </div>
    );
};
