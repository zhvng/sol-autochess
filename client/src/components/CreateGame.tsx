import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, SystemProgram, Transaction, TransactionInstruction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import useBurnerWalletStore from 'stores/useBurnerWalletStore';
import { getProgram } from 'utils/program';
import { notify } from "../utils/notifications";
import * as anchor from "@project-serum/anchor";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import { clearGameInputs, createGameInputs } from 'utils/gameInputs';

export const CreateGame: FC = () => {
    const router = useRouter();
    const wallet = useAnchorWallet();
    const { connection } = useConnection();

    const onClick = useCallback(async () => {
        if (!wallet) {
            notify({ type: 'error', message: `Wallet not connected!` });
            console.log('error', `Create Game: Wallet not connected!`);
            return;
        }
        console.log(wallet);
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

            signature = await program.rpc.createGame(
                randomGameId, 
                burnerWallet.publicKey.toBytes(),
                new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * .05), 
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
    }, [wallet, notify, connection]);

    return (
        <div>
            <button
                className="group w-60 m-2 btn animate disabled:animate-none bg-slate-600"
                onClick={onClick} disabled={!wallet}
            >
                <div className="hidden group-disabled:block ">
                    Wallet not connected
                </div>
                <span className="block group-disabled:hidden" > 
                    Create Game 
                </span>
            </button>
            <br></br>
        </div>
    );
};
