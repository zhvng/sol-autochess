import { Program, web3 } from "@project-serum/anchor";
import { AnchorWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import TWEEN from "@tweenjs/tween.js";
import useGameStateStore from "stores/useGameStateStore";
import { Camera, QuadraticBezierCurve, Scene, Vector3 } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { clearGameInputs, GameInputs } from "utils/gameInputs";
import { notify } from "utils/notifications";
import { getProgram } from "utils/program";
import { ControllerWasm, UnitTypeWasm, WasmState, draw_private_hand } from "wasm-client";
import { GameProgress } from "./Utils";
import BN from 'bn.js';
import Game from "./Game";

class GameController {
    private wasmState: WasmState;
    private gameProgress: GameProgress;
    private interval: NodeJS.Timer;
    private waitingForPlayersObject?: CSS2DObject;
    private waitingForRevealObject?: CSS2DObject;
    private timestamp?: number;
    private timer: CSS2DObject;
    private isInitializer: boolean = true;
    private lastGameState?;

    private burnerWallet: Keypair;

    constructor(private readonly scene: Scene, private readonly camera: Camera, private readonly gamePDAKey: PublicKey, private readonly program: Program, private readonly gameInputs: GameInputs) {
        this.wasmState = new WasmState();
        this.gameProgress = GameProgress.WaitingForOpponent;

        this.burnerWallet = Keypair.fromSecretKey(Uint8Array.from(this.gameInputs.burnerWalletSecret));
        this.interval = setInterval(()=>{
            this.updateState();
        }, 5000);
        this.initState();

        const timerDiv = document.createElement('div');
        timerDiv.style.fontSize = '30px'
        this.timer = new CSS2DObject(timerDiv);
        this.timer.position.set(0,20,0);
        this.scene.add(this.timer);
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

    /**
     * Update control visuals
     */
    public async update() {
        if (this.timestamp) {
            const timeRemaining = this.timeRemaining();
            if (timeRemaining > 0) this.timer.element.textContent = String(timeRemaining);
            else this.timer.element.textContent = '';
        } else {
            this.timer.element.textContent = "";
        }
    }

    private timeRemaining() {
        if (this.timestamp === undefined) return 0;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return Math.max(this.timestamp - currentTimestamp, 0);
    }

    private draw() {
        if (this.gameProgress === GameProgress.WaitingForOpponent) {
            if (this.waitingForPlayersObject === undefined) {
                const waitingForPlayersDiv = document.createElement('div');
                waitingForPlayersDiv.style.position = 'absolute';
                waitingForPlayersDiv.innerHTML=(`
                    <div style="font-size:48px;color:gray;">WAITING FOR OPPONENT </div>
                    <div style="font-size:16px;color:gray; width:50%; margin: auto;">*make sure to hit cancel before leaving this page! (to get your money back) </div>
                `)
                waitingForPlayersDiv.style.textAlign ='center';
                waitingForPlayersDiv.style.width ='100%';
                waitingForPlayersDiv.style.backgroundColor ='rgba(255, 255, 255, 0.3)';
                waitingForPlayersDiv.style.padding ='10px';
                const button = document.createElement('button');
                button.addEventListener('pointerdown', ()=>{
                    console.log('asdf')
                    this.cancelGame();
                });
                button.innerHTML="cancel";
                button.style.border = '2px solid red';
                button.style.color = 'red';
                button.style.fontSize = '18px';
                button.style.padding = '5px';
                button.style.marginTop = '10px';
                waitingForPlayersDiv.appendChild(button);
                this.waitingForPlayersObject = new CSS2DObject(waitingForPlayersDiv)
                this.waitingForPlayersObject.position.setY(5);
                this.scene.add(this.waitingForPlayersObject);
            }
        } else {
            if (this.waitingForPlayersObject !== undefined) {
                this.scene.remove(this.waitingForPlayersObject);
                this.waitingForPlayersObject = undefined;
            }
        }

        if (this.waitingForRevealObject !== undefined) {
            this.scene.remove(this.waitingForRevealObject);
            this.waitingForRevealObject = undefined;
        }
        if (this.gameProgress === GameProgress.WaitingForOpponentReveal1 ||
            this.gameProgress === GameProgress.WaitingForOpponentReveal2) {
            if (this.waitingForRevealObject === undefined) {
                const waitingForRevealDiv = document.createElement('div');
                waitingForRevealDiv.style.position = 'absolute';
                waitingForRevealDiv.innerHTML=(`
                    <div style="font-size:32px;color:white;">waiting for opponent to reveal </div>
                `)
                waitingForRevealDiv.style.textAlign ='center';
                waitingForRevealDiv.style.width ='100%';
                waitingForRevealDiv.style.backgroundColor ='rgba(220, 220, 220, 0.3)';
                waitingForRevealDiv.style.padding ='10px';

                const timeRemaining = this.timeRemaining();
                if (timeRemaining === 0) {
                    const button = document.createElement('button');
                    button.addEventListener('pointerdown', ()=>{
                        this.claimInactivity();
                    });
                    button.innerHTML="claim victory";
                    button.style.border = '2px solid green';
                    button.style.color = 'green';
                    button.style.fontSize = '18px';
                    button.style.padding = '5px';
                    button.style.marginTop = '10px';
                    waitingForRevealDiv.appendChild(button);
                }
                this.waitingForRevealObject = new CSS2DObject(waitingForRevealDiv)
                this.waitingForRevealObject.position.setY(25);
                this.scene.add(this.waitingForRevealObject);
            }
        } else {
            if (this.waitingForRevealObject !== undefined) {
                this.scene.remove(this.waitingForRevealObject);
                this.waitingForRevealObject = undefined;
            }
        }
    } 
    
    private async fetchGameState() {
        const account = await this.program.account.game.fetch(this.gamePDAKey);
        this.lastGameState = account;
        console.log(account);
        return account;
    }

    public async initState() {
        try {
            const account = await this.fetchGameState();
            console.log(account);
            this.isInitializer = true;
            if ((account.initializer as PublicKey).toBase58() === this.program.provider.wallet.publicKey.toBase58()) {
                this.isInitializer = true;
            } else if ((account.opponent as PublicKey).toBase58() === this.program.provider.wallet.publicKey.toBase58()) {
                this.isInitializer = false;
            } else {
                //you're not in this game lmao
                throw new Error('you are not a player in this game');
            }

            if (this.isInitializer) {
                this.camera.position.set(0, 50, 45);
                // this.camera.lookAt(new Vector3(0,0,0));
            } else {
                this.camera.position.set(0, 50, -45);
                this.camera.lookAt(new Vector3(0,0,0));
            }

            if (account.state === 1) {
                if (this.isInitializer && account.iHasRevealed || !this.isInitializer && account.oHasRevealed) {
                    this.gameProgress = GameProgress.WaitingForOpponentReveal1;
                } else {
                    this.gameProgress = GameProgress.Reveal1;
                }
            } else if (account.state === 2) {
                if (this.isInitializer && account.iHasRevealed || !this.isInitializer && account.oHasRevealed) {
                    this.gameProgress = GameProgress.WaitingForOpponentReveal2;
                } else {
                    this.gameProgress = GameProgress.PlacePieces;
                }
            } else if (account.state === 3) {
                if (account.winCondition['inProgress'] !== undefined) {
                    this.gameProgress = GameProgress.InProgress;
                } else {
                    this.gameProgress = GameProgress.End;
                }
            }
            this.draw();
        } catch(error) {
            notify({ type: 'error', message: `Error!`, description: error?.message });
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'absolute';
            errorDiv.innerHTML=(`
                <div style="font-size:30px;color:red;">error</div>
            `)
            const button = document.createElement('button');
            button.addEventListener('click', ()=>{
                window.location.href = '/';
            });
            button.innerHTML="back";
            const button2 = document.createElement('button');
            button2.addEventListener('click', ()=>{
                window.location.href = '';
            });
            button2.innerHTML="refresh";
            button2.style.display = 'block';
            errorDiv.appendChild(button2);
            errorDiv.appendChild(button);
            this.waitingForPlayersObject = new CSS2DObject(errorDiv)
            this.scene.add(this.waitingForPlayersObject);
        }
    }

    public async updateState() {
        // console.log(draw_private_hand(Uint8Array.from(this.gameInputs.reveal1), Uint8Array.from(this.gameInputs.reveal2)));
        console.log(this.gameProgress);
        if (this.gameProgress === GameProgress.WaitingForOpponent) {
            const account = await this.fetchGameState();
            if (account.state !== undefined) {
                if (account.state === 1) {
                    this.gameProgress = GameProgress.Reveal1;
                }
            }
        } else if (this.gameProgress === GameProgress.Reveal1) {
            // send reveal 1 and change state
            this.timestamp = undefined;
            await this.reveal1();
            this.updateState();

        } else if(this.gameProgress === GameProgress.WaitingForOpponentReveal1) {
            const account = await this.fetchGameState();
            if (account.state === 2) {
                this.gameProgress = GameProgress.PlacePieces;
            }
            console.log(account);
            if (this.isInitializer && account.oInactivityTimer) {
                this.timestamp = (account.oInactivityTimer as BN).toNumber();   
            } else if(!this.isInitializer && account.iInactivityTimer) {
                this.timestamp = (account.iInactivityTimer as BN).toNumber();   
            }

        } else if(this.gameProgress === GameProgress.PlacePieces) {
            const account = await this.fetchGameState();
            // check timer , if timer is over reveal2
            this.timestamp = (account.pieceTimer as BN).toNumber();
            if (this.timeRemaining() === 0) this.gameProgress = GameProgress.Reveal2;

        } else if (this.gameProgress === GameProgress.Reveal2) {
            this.gameProgress = GameProgress.WaitingForOpponentReveal2;
            this.timestamp = undefined;
            await this.reveal2();

        } else if (this.gameProgress === GameProgress.WaitingForOpponentReveal2) {
            const account = await this.fetchGameState();

            if (account.state === 3) {
                this.gameProgress = GameProgress.InProgress;
            }
            if (this.isInitializer && account.oInactivityTimer) {
                this.timestamp = (account.oInactivityTimer as BN).toNumber();   
            } else if(!this.isInitializer && account.iInactivityTimer) {
                this.timestamp = (account.iInactivityTimer as BN).toNumber();   
            }

        } else if(this.gameProgress === GameProgress.InProgress) {
            // crank game a ton
            for (let i=0; i<5; i++) {
                const tx = this.program.transaction.crankGame(5 + Math.floor(i/5), {
                    accounts: {
                    game: this.gamePDAKey,
                    invoker: this.burnerWallet.publicKey,
                    },
                    signers: [this.burnerWallet],
                });
                const signature = web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                    this.burnerWallet
                ]);
                notify({ type: 'success', message: 'Sent crank transaction!' });
            }
            const account = await this.fetchGameState();
            const winCondition = account.winCondition;
            if (winCondition !== undefined) {
                if (winCondition['inProgress'] === undefined) {
                    console.log(account);
                    this.gameProgress = GameProgress.End;
                }
            }

        } else if(this.gameProgress === GameProgress.End) {
            // check who won
            if (this.lastGameState.winCondition['tie'] !== undefined) {
                await this.program.rpc.claimVictory({
                    accounts: {
                      game: this.gamePDAKey,
                      invoker: this.program.provider.wallet.publicKey,
                      initializer: this.lastGameState.initializer,
                      opponent: this.lastGameState.opponent,
                    },
                });
            } else if (this.lastGameState.winCondition['initializer'] !== undefined) {

            } else if (this.lastGameState.winCondition['opponent'] !== undefined) {

            }
        }
        this.draw()
    }

    private async claimVictory() {
        console.log('sending claim victory');
        let signature = '';
        try {
            await this.program.rpc.claimVictory({
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.program.provider.wallet.publicKey,
                  initializer: this.lastGameState.initializer,
                  opponent: this.lastGameState.opponent,
                },
            });

            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            clearGameInputs(this.gamePDAKey, this.program.provider.wallet.publicKey);
            window.location.href = '/';
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }

    private async drainBurner() {
        const balance = await this.program.provider.connection.getBalance(
            this.burnerWallet.publicKey,
            'confirmed'
        );
        const drainBurnerWalletIx: TransactionInstruction = SystemProgram.transfer({
            fromPubkey: this.burnerWallet.publicKey,
            toPubkey: this.program.provider.wallet.publicKey,
            lamports: balance,
        });
        const tx = new web3.Transaction().add(drainBurnerWalletIx);
        let signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
            this.burnerWallet
        ]);
    }

    private async claimInactivity() {
        console.log('sending claiminactivity');
        let signature = '';
        try {
            const balance = await this.program.provider.connection.getBalance(
                this.burnerWallet.publicKey,
                'confirmed'
            );
            const drainBurnerWalletIx: TransactionInstruction = SystemProgram.transfer({
                fromPubkey: this.burnerWallet.publicKey,
                toPubkey: this.program.provider.wallet.publicKey,
                lamports: balance,
            });
    
            signature = await this.program.rpc.claimInactivity({
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.program.provider.wallet.publicKey,
                  initializer: this.lastGameState!.initializer,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                },
                postInstructions: [
                    drainBurnerWalletIx
                ],
                signers: [
                    this.burnerWallet
                ]
            });
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            clearGameInputs(this.gamePDAKey, this.program.provider.wallet.publicKey);
            window.location.href = '/';
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }

    private async reveal1() {
        this.gameProgress = GameProgress.WaitingForOpponentReveal1;
        let signature = '';
        try {
            const tx = this.program.transaction.revealFirst(this.gameInputs.reveal1, this.gameInputs.secret1, {
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.burnerWallet.publicKey,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [this.burnerWallet]
            });
            signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                this.burnerWallet
            ]);
            notify({ type: 'success', message: 'Reveal successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Reveal failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            this.gameProgress = GameProgress.Reveal1;
        }
    }

    private async reveal2() {
        this.gameProgress = GameProgress.WaitingForOpponentReveal2;
        let signature = '';
        try {
            const tx = this.program.transaction.revealSecond(this.gameInputs.reveal2, this.gameInputs.secret2, {
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.burnerWallet.publicKey,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [this.burnerWallet]
            });
            signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                this.burnerWallet
            ]);
            notify({ type: 'success', message: 'Reveal 2 successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Reveal 2 failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            this.gameProgress = GameProgress.Reveal2;
        }
    }

    private async cancelGame() {
        let signature = '';
        try {
            const balance = await this.program.provider.connection.getBalance(
                this.burnerWallet.publicKey,
                'confirmed'
            );
            const drainBurnerWalletIx: TransactionInstruction = SystemProgram.transfer({
                fromPubkey: this.burnerWallet.publicKey,
                toPubkey: this.program.provider.wallet.publicKey,
                lamports: balance,
            });
    
            signature = await this.program.rpc.cancelGame({
                accounts: {
                    game: this.gamePDAKey,
                    initializer: this.program.provider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }, 
                postInstructions: [
                    drainBurnerWalletIx
                ],
                signers: [
                    this.burnerWallet
                ]
            });
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            clearGameInputs(this.gamePDAKey, this.program.provider.wallet.publicKey);
            window.location.href = '/';
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }
}

export default GameController;