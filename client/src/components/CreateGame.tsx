import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { FC, useCallback, useState } from 'react';
import { getProgram } from 'utils/program';
import { notify } from "../utils/notifications";
import * as anchor from "@project-serum/anchor";
import { v4 as uuidv4 } from 'uuid';
import { clearGameInputs, createGameInputs } from 'utils/gameInputs';
import useUserSOLBalanceStore from 'stores/useUserSOLBalanceStore';
import { useConnectionWrapper } from 'hooks/useConnectionWrapper';

export const CreateGame: FC = () => {
    const wallet = useAnchorWallet();
    const { connection } = useConnectionWrapper();

    const [wagerSize, setWagerSize] = useState<number>(0.1);
    const balance = useUserSOLBalanceStore((s) => s.balance);

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
                fromPubkey: program.provider.publicKey,
                toPubkey: burnerWallet.publicKey,
                lamports: Math.floor(anchor.web3.LAMPORTS_PER_SOL / 500), // .001 sol to cover tx fees
            });

            const wagerLamports = wagerSize*anchor.web3.LAMPORTS_PER_SOL;
            signature = await program.rpc.createGame(
                randomGameId, 
                burnerWallet.publicKey.toBytes(),
                new anchor.BN(wagerLamports), 
                Uint8Array.from(gameInputs.commitment1), 
                Uint8Array.from(gameInputs.commitment2), 
                5,
                8,
                {
                    accounts: {
                        game: gamePDAKey,
                        initializer: program.provider.publicKey,
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
    }, [wallet, connection, wagerSize]);

    return (
        <div className='w-52 bg-slate-800 rounded-lg'>
            {/* <div className='px-2 w-full border-b-2 border-white'>
                Create game
            </div> */}
            <div className={`p-3 text-center ${!wallet && 'text-slate-600'}`}>
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
            {/* {wallet && <p className="text-slate-300 text-xs">balance: {(balance || 0).toLocaleString()} sol</p>} */}
            <button
                className="block mx-auto group mt-2 btn animate disabled:animate-none bg-slate-600"
                onClick={onClick} disabled={!wallet || balance < wagerSize}
            >
                <div className="hidden group-disabled:block ">
                    {balance < wagerSize && wallet ? "Insufficient funds" : "Wallet not connected"}
                </div>
                <span className="block group-disabled:hidden" > 
                    Create Game
                </span>
            </button>
            </div>
        </div>
    );
};
