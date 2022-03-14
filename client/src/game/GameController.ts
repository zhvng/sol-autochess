import { Program, web3 } from "@project-serum/anchor";
import { AnchorWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import useGameInputsStore, { GameInputs } from "stores/useGameInputsStore";
import useGameStateStore from "stores/useGameStateStore";
import { notify } from "utils/notifications";
import { getProgram } from "utils/program";
import { ControllerWasm, UnitTypeWasm, WasmState } from "wasm-client";
import { GameProgress } from "./Utils";

class GameController {
    private wasmState: WasmState;
    private gameProgress: GameProgress;
    private interval: NodeJS.Timer;

    private burnerWallet: Keypair;

    constructor(private readonly gamePDAKey: PublicKey, private readonly program: Program, private readonly gameInputs: GameInputs) {
        this.wasmState = new WasmState();
        this.gameProgress = GameProgress.WaitingForOpponent;

        this.burnerWallet = Keypair.fromSecretKey(Uint8Array.from(this.gameInputs.burnerWalletSecret));
        this.interval = setInterval(()=>{
            this.updateState();
        }, 5000);
    }

    public placePiece(x: number, y: number, unitType: UnitTypeWasm, controller: ControllerWasm) {
        console.log('placing piece')
        return this.wasmState.place_piece(x, y, unitType, controller);
    }

    public step() {
        if (this.gameProgress === GameProgress.InProgress) {
            this.wasmState.step();
        }
    }

    public getEntities() {
        return this.wasmState.get_entities();
    }
    public getEntityById(id: number) {
        return this.wasmState.get_entity_by_id(id);
    }

    public async updateState() {
        if (this.gameProgress === GameProgress.WaitingForOpponent) {
            const account = await this.program.account.game.fetch(this.gamePDAKey);
            console.log(account);
            const state = account.state;
            if (state !== undefined) {
                if (state === 1) {
                    this.gameProgress = GameProgress.Reveal1;
                } else if (state === 2) {
                    this.gameProgress = GameProgress.PlacePieces;
                } else if (state === 3) {
                    this.gameProgress = GameProgress.InProgress;
                }
            }
        } else if (this.gameProgress === GameProgress.Reveal1) {
            // send reveal 1 and change state
            this.gameProgress = GameProgress.WaitingForOpponentReveal1;
            let signature = '';
            try {
                await this.program.rpc.revealFirst(this.gameInputs.reveal1, this.gameInputs.secret1, {
                    accounts: {
                      game: this.gamePDAKey,
                      invoker: this.burnerWallet.publicKey,
                      clock: web3.SYSVAR_CLOCK_PUBKEY,
                    },
                    signers: [this.burnerWallet]
                  });
                notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            } catch (error: any) {
                notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
                console.log('error', `Transaction failed! ${error?.message}`, signature);
                this.gameProgress = GameProgress.Reveal1;
            }
        } else if(this.gameProgress === GameProgress.WaitingForOpponentReveal1) {
            const account = await this.program.account.game.fetch(this.gamePDAKey);
            const state = account.state;
            if (state !== undefined) {
                if (state === 2) {
                    this.gameProgress = GameProgress.PlacePieces;
                }
            }
        } else if(this.gameProgress === GameProgress.PlacePieces) {
            // check timer , if timer is over reveal2
            this.gameProgress = GameProgress.Reveal2;
        } else if (this.gameProgress === GameProgress.Reveal2) {
            this.gameProgress = GameProgress.WaitingForOpponentReveal2;
            let signature = '';
            try {
                await this.program.rpc.revealSecond(this.gameInputs.reveal2, this.gameInputs.secret2, {
                    accounts: {
                        game: this.gamePDAKey,
                        invoker: this.burnerWallet.publicKey,
                    },
                    signers: [this.burnerWallet]
                  });
                notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            } catch (error: any) {
                notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
                console.log('error', `Transaction failed! ${error?.message}`, signature);
                this.gameProgress = GameProgress.Reveal2;
            }
        } else if (this.gameProgress === GameProgress.WaitingForOpponentReveal2) {
            const account = await this.program.account.game.fetch(this.gamePDAKey);
            const state = account.state;
            if (state !== undefined) {
                if (state === 3) {
                    this.gameProgress = GameProgress.InProgress;
                }
            }
        } else if(this.gameProgress === GameProgress.InProgress) {
            // crank game a ton
            for (let i=0; i<20; i++) {
                this.program.rpc.crankGame(5 + Math.floor(i/5), {
                    accounts: {
                    game: this.gamePDAKey,
                    invoker: this.burnerWallet.publicKey,
                    },
                    signers: [this.burnerWallet],
                });
            }
            const account = await this.program.account.game.fetch(this.gamePDAKey);
            const winCondition = account.winCondition;
            if (winCondition !== undefined) {
                if (winCondition['inProgress'] === undefined) {
                    this.gameProgress = GameProgress.End;
                }
            }
        } else if(this.gameProgress === GameProgress.End) {
            // check who won
        }
    }
}

export default GameController;