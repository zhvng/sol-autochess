import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, SystemProgram, Transaction, TransactionInstruction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import { getProgram } from 'utils/program';
import { notify } from "../utils/notifications";
import * as anchor from "@project-serum/anchor";
import useGameListStore from 'stores/useGameListStore';
import useGameInputsStore from 'stores/useGameInputsStore';
import useUserSOLBalanceStore from 'stores/useUserSOLBalanceStore';

export const CancelGame = ({gamePDAKey}) => {
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { gameInputs, getGameInputs } = useGameInputsStore();
    const { getGameList } = useGameListStore();
    const { getUserSOLBalance } = useUserSOLBalanceStore();

    const onClick = useCallback(async () => {
        if (!wallet) {
            notify({ type: 'error', message: `Wallet not connected!` });
            console.log('error', `Cancel Game: Wallet not connected!`);
            return;
        }
        const program = getProgram(wallet, connection);

        let signature = '';
        try {
            const gameInputs = getGameInputs(gamePDAKey, wallet.publicKey);
            const burnerWallet = Keypair.fromSecretKey(Uint8Array.from(gameInputs.burnerWalletSecret));
            console.log(burnerWallet);
            const balance = await program.provider.connection.getBalance(
                burnerWallet.publicKey,
                'confirmed'
            );
            const drainBurnerWalletIx: TransactionInstruction = SystemProgram.transfer({
                fromPubkey: burnerWallet.publicKey,
                toPubkey: program.provider.wallet.publicKey,
                lamports: balance,
            });
    
            signature = await program.rpc.cancelGame({
                accounts: {
                    game: gamePDAKey,
                    initializer: program.provider.wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                }, 
                postInstructions: [
                    drainBurnerWalletIx
                ],
                signers: [
                    burnerWallet
                ]
            });
            getUserSOLBalance(program.provider.wallet.publicKey, program.provider.connection);
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
        getGameList(program);
    }, [wallet, notify, connection]);

    return (
        <div>
            <button
                className="hover:bg-slate-500 btn animate disabled:animate-none border-2 p-1 px-3"
                onClick={onClick} disabled={!wallet}
            >
                <div className="hidden group-disabled:block ">
                    Wallet not connected
                </div>
                <span className="block group-disabled:hidden text-red-300" > 
                    cancel
                </span>
            </button>
            <br></br>
        </div>
    );
};
