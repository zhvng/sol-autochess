import { Instruction, Program, web3 } from "@project-serum/anchor";
import { AnchorWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import TWEEN from "@tweenjs/tween.js";
import useGameStateStore from "stores/useGameStateStore";
import { Camera, QuadraticBezierCurve, Scene, Vector3 } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { clearGameInputs, GameInputs } from "utils/gameInputs";
import { notify } from "utils/notifications";
import { getProgram } from "utils/program";
import { GameProgress } from "./Utils";
import BN from 'bn.js';
import Game from "./Game";
import { draw_private_hand, UnitTypeWasm } from "wasm-client";
import EntityManager from "./EntityManager";
import { UIComponent, UIController, UIReducerAction } from "pages/play/[id]";
import { UnitStats } from "models/gameTypes";

class ContractController {
    private _gameProgress: GameProgress;
    private interval: NodeJS.Timer;
    private waitingForPlayersObject?: CSS2DObject;
    private gameOverObject?: CSS2DObject;
    private timestamp?: number;
    private timer: CSS2DObject;
    private _isInitializer: boolean = true;
    private lastGameState?;
    private _hand?: Array<UnitTypeWasm>;
    private txCount: number = 0;
    private lockedIn: boolean = false;

    private burnerWallet: Keypair;

    constructor(
        private readonly scene: Scene, 
        private readonly camera: Camera, 
        private readonly gamePDAKey: PublicKey, 
        private readonly program: Program, 
        private readonly gameInputs: GameInputs,
        private readonly entityManager: EntityManager,
        private readonly uiController: UIController,
    ) {
        this.gameProgress = GameProgress.WaitingForOpponent;

        this.burnerWallet = Keypair.fromSecretKey(Uint8Array.from(this.gameInputs.burnerWalletSecret));

        const timerDiv = document.createElement('div');
        timerDiv.style.fontSize = '30px'
        this.timer = new CSS2DObject(timerDiv);
        this.timer.position.set(0,20,0);
        this.scene.add(this.timer);
    }

    public static async createContractController( 
        scene: Scene, 
        camera: Camera, 
        gamePDAKey: PublicKey, 
        program: Program, 
        gameInputs: GameInputs,
        entityManager: EntityManager,
        uiController: UIController,
    ) {
        const controller = new ContractController(
            scene, 
            camera, 
            gamePDAKey, 
            program, gameInputs, entityManager, uiController);
        await controller.initState();
        return controller;
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

    public get gameProgress() {
        return this._gameProgress;
    }
    public set gameProgress(gameProgress: GameProgress) {
        this._gameProgress = gameProgress;
    }

    public get hand() {
        return this._hand;
    }

    public get isInitializer() {
        return this._isInitializer;
    }

    private set isInitializer(isInitializer: boolean) {
        this._isInitializer = isInitializer;
    }

    private timeRemaining() {
        if (this.timestamp === undefined) return undefined;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return Math.max(this.timestamp - currentTimestamp, 0);
    }

    
    private async fetchGameState() {
        const account = await this.program.account.game.fetch(this.gamePDAKey);
        this.lastGameState = account;
        return account;
    }

    private async initState() {
        try {
            const account = await this.fetchGameState();
            this.isInitializer = true;
            if ((account.initializer as PublicKey).toBase58() === this.program.provider.publicKey.toBase58()) {
                this.isInitializer = true;
            } else if ((account.opponent as PublicKey).toBase58() === this.program.provider.publicKey.toBase58()) {
                this.isInitializer = false;
            } else {
                //you're not in this game lmao
                throw new Error('you are not a player in this game');
            }

            let x = 50, y = 45
            if (innerHeight > innerWidth) {
                // zoom out on mobile devices
                x = x * 1.6
                y = y * 1.6
            }
            if (this.isInitializer) {
                this.camera.position.set(0, x, y);
            } else {
                this.camera.position.set(0, x, -y);
            }
            this.camera.lookAt(new Vector3(0,0,0));

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
                    this.gameProgress = GameProgress.DrawPieces;
                }
            } else if (account.state === 3) {
                if (account.winCondition['inProgress'] !== undefined) {
                    this.gameProgress = GameProgress.PopulateBoard;
                } else {
                    this.gameProgress = GameProgress.End;
                }
            }
            this.draw();
            setTimeout(()=>this.updateState(),500);
        } catch(error) {
            notify({ type: 'error', message: `Error!`, description: error?.message });
            console.log(error)
            this.drawError();
        }
    }

    private setInactivityTimer() {
        if (this.isInitializer && this.lastGameState.oInactivityTimer) {
            this.timestamp = (this.lastGameState.oInactivityTimer as BN).toNumber();   
        } else if(!this.isInitializer && this.lastGameState.iInactivityTimer) {
            this.timestamp = (this.lastGameState.iInactivityTimer as BN).toNumber();   
        }
    }

    private setPieceTimer() {
        this.timestamp = (this.lastGameState.pieceTimer as BN).toNumber();
    }

    private clearTimer() {
        this.timestamp = undefined;
    }

    private async updateState() {
        console.log('progress:', this.gameProgress, ', txcount:', this.txCount);
        this.draw();
        try {
            switch (this.gameProgress) {
                case GameProgress.WaitingForOpponent:
                    await this.fetchGameState();
                    if (this.lastGameState.state === 1) {
                        this.gameProgress = GameProgress.Reveal1;
                        setTimeout(()=>this.updateState(), 500);
                        return;
                    }
                    break;
                case GameProgress.Reveal1:
                    // send reveal1
                    this.timestamp = undefined;
                    await this.reveal1();
                    await this.fetchGameState();
                    if (this.lastGameState.state === 2) {
                        this.gameProgress = GameProgress.DrawPieces;
                        this.clearTimer();
                        setTimeout(()=>this.updateState(),200);
                        return;
                    }
                    break;

                case GameProgress.WaitingForOpponentReveal1:
                    await this.fetchGameState();
                    if (this.lastGameState.state === 2) {
                        this.gameProgress = GameProgress.DrawPieces;
                        this.clearTimer();
                        setTimeout(()=>this.updateState(),200);
                        return;
                    }
                    this.setInactivityTimer();
                    break;

                case GameProgress.DrawPieces:
                    if (this.entityManager.loading === false ) {
                        await this.fetchGameState();
                        this.entityManager.drawAndPlaceHand(this.lastGameState.handSize, Uint8Array.from(this.lastGameState.reveal1), 
                            Uint8Array.from(this.gameInputs.reveal2), this.isInitializer);
                        this.gameProgress = GameProgress.PlacePieces;
                        setTimeout(()=>this.updateState(),200);
                        return;
                    }
                    break;

                case GameProgress.PlacePieces:
                    await this.fetchGameState();
                    this.entityManager.updateOpponentHiddenPieces(this.lastGameState.entities.all, this.isInitializer);
                    // check timer , if timer is over reveal2
                    this.timestamp = (this.lastGameState.pieceTimer as BN).toNumber();
                    this.lockedIn = this.getLockedIn();
                    const bothPlayersLocked = this.lastGameState.iLockedIn && this.lastGameState.oLockedIn;
                    if (this.timeRemaining() === 0 || bothPlayersLocked) {
                        this.gameProgress = GameProgress.Reveal2;
                        setTimeout(()=>this.updateState(), 500);
                        return;
                    }
                    break;

                case GameProgress.Reveal2:
                    this.timestamp = undefined;
                    await this.reveal2();
                    await this.fetchGameState();
                    if (this.lastGameState.state === 3) {
                        this.gameProgress = GameProgress.PopulateBoard;
                        this.clearTimer();
                        setTimeout(()=>this.updateState(),200);
                        return;
                    }
                    break;

                case GameProgress.WaitingForOpponentReveal2:
                    await this.fetchGameState();

                    if (this.lastGameState.state === 3) {
                        this.gameProgress = GameProgress.PopulateBoard;
                        this.clearTimer();
                        setTimeout(() => this.updateState(), 500);
                        return;
                    }
                    this.setInactivityTimer();
                    break;
                case GameProgress.PopulateBoard:
                    if (this.entityManager.loading === false ) {
                        this.entityManager.populateRevealedBoard(
                            this.lastGameState.entities.all, 
                            Uint8Array.from(this.lastGameState.reveal1), 
                            Uint8Array.from(this.lastGameState.reveal2),
                        );
                        this.gameProgress = GameProgress.InProgress;
                        setTimeout(() => {
                            this.entityManager.updateGame();

                            if (this.entityManager.simulationEnded) {
                                setTimeout(()=> this.updateState(), 100);
                            } else {
                                setTimeout(() => {this.entityManager.simulationStarted = true;}, 5000)
                                setTimeout(()=> this.updateState(), 10000);
                            }
                        }, 1000);
                        return;
                    }
                    break;
                case GameProgress.InProgress:
                    if (this.entityManager.simulationStarted === false) this.entityManager.simulationStarted = true;
                    await this.fetchGameState();
                    const winCondition = this.lastGameState.winCondition;
                    if (winCondition !== undefined) {
                        if (winCondition['inProgress'] === undefined) {
                            this.gameProgress = GameProgress.End;
                            setTimeout(() => this.updateState(), 500);
                            return;
                        }
                    }
                    notify({ type: 'info', message: 'simulating game...' });
                    const instructions = []
                    // crank game a ton
                    for (let i=0; i<5; i++) {
                        const n = 4 + i + Math.floor(this.lastGameState.tick / 20);
                        const ix = this.program.instruction.crankGame(n, {
                            accounts: {
                                game: this.gamePDAKey,
                                invoker: this.burnerWallet.publicKey,
                            },
                            signers: [this.burnerWallet],
                        });
                        instructions.push(ix)
                    }
                    const tx = this.program.transaction.crankGame(1, {
                        accounts: {
                            game: this.gamePDAKey,
                            invoker: this.burnerWallet.publicKey,
                        },
                        postInstructions: instructions,
                        signers: [this.burnerWallet],
                    });
                    const signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                        this.burnerWallet
                    ]);
                    this.txCount += 1;

                    break;

                case GameProgress.End: {
                    // check who won
                    if (this.lastGameState.winCondition['tie'] !== undefined) {
                        this.gameProgress = GameProgress.EndTie;
                    } else if (this.lastGameState.winCondition['initializer'] !== undefined) {
                        if (this.isInitializer) this.gameProgress = GameProgress.EndWin;
                        else this.gameProgress = GameProgress.EndLose;
                    } else if (this.lastGameState.winCondition['opponent'] !== undefined) {
                        if (this.isInitializer) this.gameProgress = GameProgress.EndLose;
                        else this.gameProgress = GameProgress.EndWin;
                    }
                    // drain burner
                    const drained = await this.drainBurner();
                    break;
                }

                case GameProgress.EndTie: {
                    // refresh
                    try {
                        await this.fetchGameState();
                    } catch(err) {
                        if (err?.message.startsWith('Account does not exist')) {
                            await this.cleanupBurner();
                        }
                    }

                    break;
                }
            }
        } catch(error) {
            notify({ type: 'error', message: `Error retreiving game account`, description: error?.message });
            console.log('error', `Error! ${error?.message}`);
            console.log(error);
        }
        setTimeout(()=>{
            this.updateState();
        }, 3000);
    }

    private async drawError() {
        const balance = await this.getBurnerBalance();
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.innerHTML=(`
            <div style="font-size:30px;color:red;">error</div>
            <div style="font-size:16px;color:red;">
            could not connect to the game</div>
            <div style="font-size:16px;color:red;">found a burner wallet with ${(balance/web3.LAMPORTS_PER_SOL).toFixed(3)} sol</div>
        `)

        const button = document.createElement('button');
        button.addEventListener('click', ()=>{
            window.location.href = '/';
        });
        button.innerHTML="back";
        button.style.display = 'block';
        button.style.border = '2px solid white';
        button.style.padding = '4px';

        const button2 = document.createElement('button');
        button2.addEventListener('click', ()=>{
            window.location.href = '';
        });
        button2.innerHTML="refresh";
        button2.style.display = 'block';
        button2.style.border = '2px solid white';
        button2.style.padding = '4px';

        const button3 = document.createElement('button');
        button3.addEventListener('click', async ()=>{
            this.cleanupBurner()
        });
        button3.innerHTML="empty burner wallet";
        button3.style.display = 'block';
        button3.style.border = '2px solid white';
        button3.style.padding = '4px';
        errorDiv.appendChild(button3);
        errorDiv.appendChild(button2);
        errorDiv.appendChild(button);
        this.waitingForPlayersObject = new CSS2DObject(errorDiv)
        this.scene.add(this.waitingForPlayersObject);
    }
    private draw() {
        if (this.gameProgress === GameProgress.WaitingForOpponent) {
            if (this.waitingForPlayersObject === undefined) {
                const waitingForPlayersDiv = document.createElement('div');
                waitingForPlayersDiv.style.position = 'absolute';
                waitingForPlayersDiv.innerHTML=(`
                    <div style="font-size:48px;color:gray;">WAITING FOR OPPONENT </div>
                    <div style="font-size:16px;color:gray; width:50%; margin: auto;">IMPORTANT: Remember to hit cancel before closing this page! (to get your wager back) </div>
                `)
                waitingForPlayersDiv.style.textAlign ='center';
                waitingForPlayersDiv.style.width ='100%';
                waitingForPlayersDiv.style.backgroundColor ='white';
                waitingForPlayersDiv.style.padding ='10px';
                const button = document.createElement('button');
                button.addEventListener('pointerdown', ()=>{
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
            } else {
                this.waitingForPlayersObject.visible = true;
            }
        } else {
            if (this.waitingForPlayersObject !== undefined) {
                this.waitingForPlayersObject.visible = false;
            }
        }

        const waitingForRevealShowing = this.uiController.uiState.get(UIComponent.WaitingForReveal).show;
        const claimInactivityShowing = this.uiController.uiState.get(UIComponent.ClaimInactivityButton).show; 
        if (this.gameProgress === GameProgress.WaitingForOpponentReveal1 ||
            this.gameProgress === GameProgress.WaitingForOpponentReveal2) {
            if (waitingForRevealShowing === false) {
                this.uiController.dispatchUIChange({
                    changes: new Map([
                        [UIComponent.WaitingForReveal, {show: true}]
                    ])
                });
            }
            const timeRemaining = this.timeRemaining();
            if (timeRemaining !== undefined && timeRemaining === 0) {
                if (claimInactivityShowing === false)
                    this.uiController.dispatchUIChange({
                        changes: new Map([
                            [UIComponent.ClaimInactivityButton, {show: true, onClick: ()=>{this.claimInactivity()}}]
                        ])
                    });
            }
        } else {
            if (waitingForRevealShowing === true || claimInactivityShowing === true) {
                this.uiController.dispatchUIChange({
                    changes: new Map([
                        [UIComponent.WaitingForReveal, {show: false}],
                        [UIComponent.ClaimInactivityButton, {show: false}]
                    ])
                });
            }
        }

        const placePiecesShowing = this.uiController.uiState.get(UIComponent.PlacePieces).show;
        if (this.gameProgress === GameProgress.PlacePieces) {
            if (placePiecesShowing === false) {
                const lockInOnClick = async ()=>{
                    const success = await this.lockIn();
                    if (success) {
                        this.uiController.dispatchUIChange({
                            changes: new Map([[UIComponent.LockInButton, {show: true, disabled: true, onClick: ()=>{}}]])
                        });
                        this.lockedIn = true;
                    }
                }
                this.uiController.dispatchUIChange({
                    changes: new Map([
                        [UIComponent.PlacePieces, {show: true}],
                        [UIComponent.LockInButton, {show: true, disabled: this.lockedIn, onClick: lockInOnClick}]
                    ])
                });
            }
            if (this.uiController.uiState.get(UIComponent.LockInButton).disabled === false &&
                this.lockedIn === true) {
                
                this.uiController.dispatchUIChange({
                    changes: new Map([[UIComponent.LockInButton, {show: true, disabled: true, onClick: ()=>{}}]])
                }) 
            }
        } else {
            if (placePiecesShowing === true) {
                this.uiController.dispatchUIChange({
                    changes: new Map([
                        [UIComponent.PlacePieces, {show: false}],
                        [UIComponent.LockInButton, {show: false}] 
                    ])
                });
            }
        }
        if (this.gameOverObject === undefined && !(this.entityManager.simulationStarted && !this.entityManager.simulationEnded) && (this.gameProgress === GameProgress.EndTie 
            || this.gameProgress === GameProgress.EndWin
            || this.gameProgress === GameProgress.EndLose)) {

            const gameOverDiv = document.createElement('div');

            const wagerSol = this.lastGameState.wager/web3.LAMPORTS_PER_SOL;
            if (this.gameProgress === GameProgress.EndTie) {
                gameOverDiv.innerHTML=(`
                    <div style="font-size:48px;color:gray;">tie</div>
                    <div style="font-size:16px;color:gray; width:50%; margin: auto;">Claim your buy-in below. Only 1 player has to do this step, so may fail if opponent has already claimed.</div>
                `)
                const button = document.createElement('button');
                button.addEventListener('pointerdown', ()=>{
                    console.log('claiming tie');
                    this.claimVictory();
                });
                button.innerHTML=`claim ${wagerSol.toFixed(2)} sol`;
                button.style.border = '2px solid gray';
                button.style.color = 'gray';
                button.style.fontSize = '18px';
                button.style.padding = '5px';
                button.style.marginTop = '10px';
                gameOverDiv.appendChild(button);
            } else if (this.gameProgress === GameProgress.EndWin) {
                gameOverDiv.innerHTML=(`
                    <div style="font-size:48px;color:gray;">you win!</div>
                    <div style="font-size:16px;color:gray; width:50%; margin: auto;">Claim your wager below</div>
                `)
                const button = document.createElement('button');
                button.addEventListener('pointerdown', ()=>{
                    console.log('claiming victory');
                    this.claimVictory();
                });
                button.innerHTML=`claim ${(wagerSol * 2).toFixed(2)} sol`;
                button.style.border = '2px solid green';
                button.style.color = 'green';
                button.style.fontSize = '18px';
                button.style.padding = '5px';
                button.style.marginTop = '10px';
                gameOverDiv.appendChild(button);
                
            } else {
                gameOverDiv.innerHTML=(`
                    <div style="font-size:48px;color:gray;">you lose :(</div>
                    <div style="font-size:16px;color:gray; width:50%; margin: auto;">Sending burner funds back to main wallet...</div>
                `)
                const button = document.createElement('button');
                button.addEventListener('pointerdown', async ()=>{
                    console.log('returning');
                    await this.cleanupBurner();
                });
                button.innerHTML=`return`;
                button.style.border = '2px solid gray';
                button.style.color = 'gray';
                button.style.fontSize = '18px';
                button.style.padding = '5px';
                button.style.marginTop = '10px';
                gameOverDiv.appendChild(button);
            }

            
            gameOverDiv.style.position = 'absolute';
            gameOverDiv.style.zIndex = '100';

            gameOverDiv.style.textAlign ='center';
            gameOverDiv.style.width ='100%';
            gameOverDiv.style.backgroundColor ='rgba(255,255,255,.8)';
            gameOverDiv.style.padding ='10px';
 
            const gameOverObject = new CSS2DObject(gameOverDiv)
            gameOverObject.position.setY(10);
            this.gameOverObject = gameOverObject;
            this.scene.add(gameOverObject);
        }
    } 

    public drawUnitData(show: boolean, unitStats?: UnitStats) {
        const unitDataIsShowing = this.uiController.uiState.get(UIComponent.UnitData).show;
        const oldUnitStats = this.uiController.uiState.get(UIComponent.UnitData).unitStats;
        // quick hack to prevent unit data from being redrawn every frame
        const prevUnitIsDifferentFromCurrent = oldUnitStats !== undefined 
            && unitStats !== undefined
            && (oldUnitStats.unitType !== unitStats.unitType
            || oldUnitStats.rarity !== unitStats.rarity
            || oldUnitStats.health !== unitStats.health
            || oldUnitStats.specialTrait !== unitStats.specialTrait);
        if (show !== unitDataIsShowing || prevUnitIsDifferentFromCurrent) {
            this.uiController.dispatchUIChange({
                changes: new Map([
                    [UIComponent.UnitData, {show, unitStats}]
                ]) 
            });
        }
    }

    private async cleanupBurner() {
        const balance = await this.getBurnerBalance();
        const drained = balance === 0 || await this.drainBurner();
        if (drained) {
            clearGameInputs(this.gamePDAKey, this.program.provider.publicKey);
            window.location.href = '/';
        }
    }

    private async claimVictory() {
        console.log('sending claim victory');
        let signature = '';
        try {    
            await this.program.rpc.claimVictory({
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.program.provider.publicKey,
                  initializer: this.lastGameState.initializer,
                  opponent: this.lastGameState.opponent,
                },
            });

            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            this.cleanupBurner();
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
        this.txCount += 1;
    }

    private async getBurnerBalance(): Promise<number> {
        console.log('getting balance', this.burnerWallet.publicKey.toBase58());
        const balance = await this.program.provider.connection.getBalance(
            this.burnerWallet.publicKey,
            'confirmed'
        ); 
        return balance;
    }

    private async getDrainBurnerIx(): Promise<TransactionInstruction> {
        return this.program.instruction.drainBurner({
            accounts: {
                burner: this.burnerWallet.publicKey,
                main: this.program.provider.publicKey,
                systemProgram: SystemProgram.programId,
            }
        });
    }

    private async drainBurner(): Promise<boolean> {
        let signature = '';
        try{
            const drainBurnerWalletIx: TransactionInstruction = await this.getDrainBurnerIx();
            const tx = new web3.Transaction().add(drainBurnerWalletIx);
            signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                this.burnerWallet
            ]);
            notify({ type: 'success', message: 'Burner funds returned to main wallet!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Failed to drain burner wallet!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return false;
        }
        this.txCount += 1;
        return true;
    }

    private async claimInactivity() {
        console.log('sending claiminactivity');
        let signature = '';
        try {
            const drainBurnerWalletIx: TransactionInstruction = await this.getDrainBurnerIx();
    
            signature = await this.program.rpc.claimInactivity({
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.program.provider.publicKey,
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
            clearGameInputs(this.gamePDAKey, this.program.provider.publicKey);
            window.location.href = '/';
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
    }
    private async lockIn(): Promise<boolean> {
        let signature = '';
        try {
            const tx = this.program.transaction.lockIn({
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.burnerWallet.publicKey,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [
                    this.burnerWallet
                ]
            });
            signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                this.burnerWallet
            ]);
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            return true;
        } catch (error: any) {
            console.log(error);
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return false;
        }
    }

    private getLockedIn() {
        if (this.isInitializer && this.lastGameState.iLockedIn) return true;
        if (!this.isInitializer && this.lastGameState.oLockedIn) return true;
        return false;
    }

    private async reveal1() {
        console.log('sending reveal1');
        let signature = '';
        try {
            this.gameProgress = GameProgress.WaitingForOpponentReveal1;
            const tx = this.program.transaction.revealFirst(this.gameInputs.reveal1, this.gameInputs.secret1, {
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.burnerWallet.publicKey,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [this.burnerWallet]
            });
            notify({ type: 'info', message: 'Revealing first commitment...' });
            signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                this.burnerWallet
            ]);
            notify({ type: 'success', message: 'Reveal successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Reveal failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            this.gameProgress = GameProgress.Reveal1;
        }
        this.txCount += 1;
    }

    private async reveal2() {
        console.log('sending reveal2');
        let signature = '';
        try {
            this.gameProgress = GameProgress.WaitingForOpponentReveal2;
            const tx = this.program.transaction.revealSecond(this.gameInputs.reveal2, this.gameInputs.secret2, {
                accounts: {
                  game: this.gamePDAKey,
                  invoker: this.burnerWallet.publicKey,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                },
                signers: [this.burnerWallet]
            });
            notify({ type: 'info', message: 'Revealing second commitment...' });
            signature = await web3.sendAndConfirmTransaction(this.program.provider.connection, tx, [
                this.burnerWallet
            ]);
            notify({ type: 'success', message: 'Reveal 2 successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Reveal 2 failed!`, description: error?.message, txid: signature });
            console.log('error', `Reveal transaction failed! ${error?.message}`, signature);
            this.gameProgress = GameProgress.Reveal2;
        }
        this.txCount += 1;
    }

    private async cancelGame() {
        let signature = '';
        try {
            const drainBurnerWalletIx: TransactionInstruction = await this.getDrainBurnerIx();
    
            signature = await this.program.rpc.cancelGame({
                accounts: {
                    game: this.gamePDAKey,
                    initializer: this.program.provider.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }, 
                postInstructions: [
                    drainBurnerWalletIx
                ],
                signers: [
                    this.burnerWallet,
                ]
            });
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
            clearGameInputs(this.gamePDAKey, this.program.provider.publicKey);
            window.location.href = '/';
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return;
        }
        this.txCount += 1;
    }
    public async placePiece(gridX: number, gridY: number, handPosition: number): Promise<boolean> {
        let signature = '';
        try {
            notify({ type: 'info', message: `placing piece #${handPosition} at (${gridX}, ${gridY})`, txid: signature });
            
            const tx = this.program.transaction.placePieceHidden(gridX, gridY, handPosition, {
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
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return false;
        }
        this.txCount += 1;
        return true;
    }
    public async movePiece(gridX: number, gridY: number, handPosition: number): Promise<boolean> {
        let signature = '';
        try {
            notify({ type: 'info', message: `moving piece #${handPosition} to (${gridX}, ${gridY})`, txid: signature });
            
            const tx = this.program.transaction.movePieceHidden(gridX, gridY, handPosition, {
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
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return false;
        }
        this.txCount += 1;
        return true;
    }
    public async removePiece(handPosition: number): Promise<boolean> {
        let signature = '';
        try {
            notify({ type: 'info', message: `removing piece #${handPosition}`, txid: signature });
            
            const tx = this.program.transaction.removePieceHidden(handPosition, {
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
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            console.log('error', `Transaction failed! ${error?.message}`, signature);
            return false;
        }
        this.txCount += 1;
        return true;
    }
}

export default ContractController;