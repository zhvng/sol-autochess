import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { hash } from '@project-serum/anchor/dist/cjs/utils/sha256';
import { Autochess } from '../target/types/autochess';
import CryptoJS from 'crypto-js';
import assert from 'assert';

const program = anchor.workspace.Autochess as Program<Autochess>;
describe('autochess', async () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const opponent = anchor.web3.Keypair.generate();
  const gamePDA = (await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("game 1"),
      Buffer.from('Game'),
    ],
    program.programId
  ));
  const gamePDAKey = gamePDA[0]
  console.log(gamePDAKey)
  const initializerReveal1 = hash('random1');
  const initializerSecret1 = hash('secret1');
  const initializerCommitment1Unhashed = Buffer.from([...Buffer.from(initializerReveal1, 'hex'), ...Buffer.from(initializerSecret1, 'hex')]).toString('hex');
  const initializerReveal2 = hash('random2');
  const opponentReveal1 = hash('op ranodm-');
  const opponentSecret1 = hash('osecret1');
  const opponentCommitment1Unhashed = Buffer.from([...Buffer.from(opponentReveal1, 'hex'), ...Buffer.from(opponentSecret1, 'hex')]).toString('hex');
  const opponentReveal2 = hash('op op adsfasdfop');

  const initializerCommitment1 = [...Buffer.from(CryptoJS.SHA256(CryptoJS.enc.Hex.parse(initializerCommitment1Unhashed)).toString(), 'hex')];
  const opponentCommitment1 = [...Buffer.from(CryptoJS.SHA256(CryptoJS.enc.Hex.parse(opponentCommitment1Unhashed)).toString(), 'hex')];
  console.log(initializerCommitment1);
  console.log(opponentCommitment1);

  const UnitType = {
    Wolf: { wolf: {} },
    Bear: { bear: {} },
    Bull: { bull: {} },
  };

  it('Is initialized!', async () => {
    // Airdropping tokens to a payer.
    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(opponent.publicKey, anchor.web3.LAMPORTS_PER_SOL*2),
      "confirmed"
    );
    const tx = await program.rpc.createGame("game 1", new anchor.BN(anchor.web3.LAMPORTS_PER_SOL), initializerCommitment1, [...Buffer.from(hash(initializerReveal2), 'hex')], {
      accounts: {
        game: gamePDAKey,
        initializer: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.initializer, program.provider.wallet.publicKey, 'Account was not correctly initialized');
    const accountInfo = await program.account.game.getAccountInfo(gamePDAKey);
    console.log(accountInfo);
  });

  it('joins!', async () => {
    const tx = await program.rpc.joinGame(opponentCommitment1, [...Buffer.from(hash(opponentReveal2), 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: opponent.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [opponent]
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.opponent, opponent.publicKey, 'Opponent did not correctly join');
  });

  it('reveals!', async () => {
    const tx = await program.rpc.revealFirst([...Buffer.from(opponentReveal1, 'hex')], [...Buffer.from(opponentSecret1, 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: opponent.publicKey,
      },
      signers: [opponent]
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.oHasRevealed, true, 'First reveal was correct');
  });

  it('error when trying to repeat reveal', async () => {
    assert.rejects(async () => {
      await program.rpc.revealFirst([...Buffer.from(initializerReveal1, 'hex')], {
        accounts: {
          game: gamePDAKey,
          invoker: opponent.publicKey,
        },
        signers: [opponent]
      });
    });
  });

  it('finish reveal', async () => {
    const tx = await program.rpc.revealFirst([...Buffer.from(initializerReveal1, 'hex')], [...Buffer.from(initializerSecret1, 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: program.provider.wallet.publicKey,
      }
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.reveal1, [
      186,  14, 247,  80, 131, 223,  77, 118,
       11,  13,  47, 194, 179, 162, 143, 151,
      254, 123,   1,  13, 195, 245,   8, 230,
       62, 192, 134, 154, 221,  53, 245,  89
    ], 'Incorrect reveal');
  });

  it('place pieces', async () => {
    await program.rpc.placePiece(1, 1, UnitType.Wolf, {
      accounts: {
        game: gamePDAKey,
        invoker: program.provider.wallet.publicKey,
      }
    });
    await program.rpc.placePiece(1, 2, UnitType.Wolf, {
      accounts: {
        game: gamePDAKey,
        invoker: program.provider.wallet.publicKey,
      }
    });
    await program.rpc.placePiece(0, 1, UnitType.Wolf, {
      accounts: {
        game: gamePDAKey,
        invoker: program.provider.wallet.publicKey,
      }
    });
    await program.rpc.placePiece(7, 7, UnitType.Wolf, {
      accounts: {
        game: gamePDAKey,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.placePiece(6, 7, UnitType.Bear, {
      accounts: {
        game: gamePDAKey,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.placePiece(3, 5, UnitType.Bull, {
      accounts: {
        game: gamePDAKey,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.entities.all, [
      {
        id: 0,
        owner: { initializer: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 150, y: 150 },
        health: 100,
        unitType: { wolf: {} },
        state: { idle: {} }
      },
      {
        id: 1,
        owner: { initializer: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 150, y: 250 },
        health: 100,
        unitType: { wolf: {} },
        state: { idle: {} }
      },
      {
        id: 2,
        owner: { initializer: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 50, y: 150 },
        health: 100,
        unitType: { wolf: {} },
        state: { idle: {} }
      },
      {
        id: 3,
        owner: { opponent: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 750, y: 750 },
        health: 100,
        unitType: { wolf: {} },
        state: { idle: {} }
      },
      {
        id: 4,
        owner: { opponent: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 650, y: 750 },
        health: 250,
        unitType: { bear: {} },
        state: { idle: {} }
      },
      {
        id: 5,
        owner: { opponent: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 350, y: 550 },
        health: 150,
        unitType: { bull: {} },
        state: { idle: {} }
      }
    ], 'Incorrect pieces placed');
  });

  it('crank', async ()=>{

    for (let i=0; i<20; i+=1) {
      await program.rpc.crankGame(5, {
        accounts: {
          game: gamePDAKey,
          invoker: opponent.publicKey,
        },
        signers: [opponent],
      });
    }
    const account = await program.account.game.fetch(gamePDAKey);
    console.log("pda account", account);
    assert.deepStrictEqual(account.winCondition, {initializer: {} }, 'Wrong winner');
  });
  it('reject incorrect claim', async ()=>{
    assert.rejects(async () => {
      await program.rpc.claimVictory({
        accounts: {
          game: gamePDAKey,
          invoker: opponent.publicKey,
          initializer: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [opponent],
      });
    });
  });

  it('correct claim', async ()=>{
    const account = await program.account.game.getAccountInfo(program.provider.wallet.publicKey);
    let lamports = account.lamports;
    await program.rpc.claimVictory(
      'game 1',
      gamePDA[1], {
      accounts: {
        game: gamePDAKey,
        invoker: program.provider.wallet.publicKey,
        initializer: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    lamports -= (await program.account.game.getAccountInfo(program.provider.wallet.publicKey)).lamports;
    assert.deepStrictEqual(lamports, -2063525888, 'Incorrect lamports deposited');
  });
});
