import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { hash } from '@project-serum/anchor/dist/cjs/utils/sha256';
import { Autochess } from '../target/types/autochess';
import CryptoJS from 'crypto-js';
import assert from 'assert';
import bs58 from 'bs58';

const program = anchor.workspace.Autochess as Program<Autochess>;
describe('autochess', async () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const opponent = anchor.web3.Keypair.generate();
  const iBurner = anchor.web3.Keypair.generate();
  const oBurner = anchor.web3.Keypair.generate();

  const gamePDA = (await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("game 1"),
      Buffer.from('Game'),
    ],
    program.programId
  ));
  const gamePDAKey = gamePDA[0]
  const initializerReveal1 = hash('random1');
  const initializerSecret1 = hash('secret1');
  const initializerCommitment1Unhashed = Buffer.from([...Buffer.from(initializerReveal1, 'hex'), ...Buffer.from(initializerSecret1, 'hex')]).toString('hex');
  const opponentReveal1 = hash('op ranodm-');
  const opponentSecret1 = hash('osecret1');
  const opponentCommitment1Unhashed = Buffer.from([...Buffer.from(opponentReveal1, 'hex'), ...Buffer.from(opponentSecret1, 'hex')]).toString('hex');
  
  const initializerCommitment1 = [...Buffer.from(CryptoJS.SHA256(CryptoJS.enc.Hex.parse(initializerCommitment1Unhashed)).toString(), 'hex')];
  const opponentCommitment1 = [...Buffer.from(CryptoJS.SHA256(CryptoJS.enc.Hex.parse(opponentCommitment1Unhashed)).toString(), 'hex')];

  const initializerReveal2 = hash('random2');
  const initializerSecret2 = hash('secret2');
  const initializerCommitment2Unhashed = Buffer.from([...Buffer.from(initializerReveal2, 'hex'), ...Buffer.from(initializerSecret2, 'hex')]).toString('hex');
  const opponentReveal2 = hash('op op adsfasdfop');
  const opponentSecret2 = hash('osecret2l');
  const opponentCommitment2Unhashed = Buffer.from([...Buffer.from(opponentReveal2, 'hex'), ...Buffer.from(opponentSecret2, 'hex')]).toString('hex');
  
  const initializerCommitment2 = [...Buffer.from(CryptoJS.SHA256(CryptoJS.enc.Hex.parse(initializerCommitment2Unhashed)).toString(), 'hex')];
  const opponentCommitment2 = [...Buffer.from(CryptoJS.SHA256(CryptoJS.enc.Hex.parse(opponentCommitment2Unhashed)).toString(), 'hex')];
  
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
    await program.rpc.createGame(
      "game 1", 
      iBurner.publicKey.toBytes(),
      new anchor.BN(anchor.web3.LAMPORTS_PER_SOL), 
      initializerCommitment1, 
      initializerCommitment2, 
      {
        accounts: {
          game: gamePDAKey,
          initializer: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.initializer, program.provider.wallet.publicKey, 'Account was not correctly initialized');
    console.log(await program.account.game.all([{
      memcmp: {
        offset: 8,
        bytes: bs58.encode(Uint8Array.from([0])),
      }
    }]));
  });

  it('joins!', async () => {
    await program.rpc.joinGame(
      Array.from(oBurner.publicKey.toBytes()), opponentCommitment1, opponentCommitment2, {
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

  it('cancel!', async () => {
    const canceledGamePDA = (await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("game 2"),
        Buffer.from('Game'),
      ],
      program.programId
    ));
    const canceledGameKey = canceledGamePDA[0];
    await program.rpc.createGame(
      "game 2", 
      iBurner.publicKey.toBytes(),
      new anchor.BN(anchor.web3.LAMPORTS_PER_SOL), 
      initializerCommitment1, 
      initializerCommitment2, 
      {
        accounts: {
          game: canceledGameKey,
          initializer: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
    });
    assert.rejects(async () => {
      await program.rpc.cancelGame({
        accounts: {
          game: canceledGameKey,
          initializer: oBurner.publicKey,
        },
        signers: [oBurner]
      });
    });
    await program.rpc.cancelGame({
      accounts: {
        game: canceledGameKey,
        initializer: program.provider.wallet.publicKey,
      },
    });
    assert.rejects(async () => {
      await program.rpc.joinGame(
        Array.from(oBurner.publicKey.toBytes()), opponentCommitment1, opponentCommitment2, {
        accounts: {
          game: canceledGameKey,
          invoker: opponent.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [opponent]
      });
    });
  });

  it ('drain burner!', async () => {
    const burner = anchor.web3.Keypair.generate();
    const main = anchor.web3.Keypair.generate();
    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(burner.publicKey, anchor.web3.LAMPORTS_PER_SOL*2),
      "confirmed"
    );
    console.log(burner, main)
    await program.rpc.drainBurner({
      accounts: {
        burner: burner.publicKey,
        main: main.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [burner]
    });
    const mainInfo = await program.account.game.getAccountInfo(main.publicKey);
    const burnerInfo = await program.account.game.getAccountInfo(burner.publicKey);
    assert.deepStrictEqual(mainInfo.lamports, anchor.web3.LAMPORTS_PER_SOL*2, 'Main did not receive tokens');
    assert.deepStrictEqual(burnerInfo, null, 'Burner was not drained');
  })

  it('reveals!', async () => {
    const tx = await program.rpc.revealFirst([...Buffer.from(opponentReveal1, 'hex')], [...Buffer.from(opponentSecret1, 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner]
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.oHasRevealed, true, 'First reveal was correct');
  });

  it('error when trying to repeat reveal', async () => {
    assert.rejects(async () => {
      await program.rpc.revealFirst([...Buffer.from(initializerReveal1, 'hex')], [...Buffer.from(initializerSecret1, 'hex')], {
        accounts: {
          game: gamePDAKey,
          invoker: oBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [oBurner]
      });
    });
  });

  it('finish reveal', async () => {
    const tx = await program.rpc.revealFirst([...Buffer.from(initializerReveal1, 'hex')], [...Buffer.from(initializerSecret1, 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: iBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [iBurner]
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
    // REJECT: place piece out of bounds
    await assert.rejects(async () => {
      await program.rpc.placePieceHidden(8, 0, 3, {
        accounts: {
          game: gamePDAKey,
          invoker: iBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [iBurner],
      });
    }, 'place piece out of bounds');
    // REJECT: place piece on wrong side
    await assert.rejects(async () => {
      await program.rpc.placePieceHidden(4, 0, 3, {
        accounts: {
          game: gamePDAKey,
          invoker: oBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [oBurner],
      });
    }, 'place piece on wrong side');
    
    await program.rpc.placePieceHidden(1, 1, 0, {
      accounts: {
        game: gamePDAKey,
        invoker: iBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [iBurner]
    });
    await program.rpc.placePieceHidden(0, 1, 2, {
      accounts: {
        game: gamePDAKey,
        invoker: iBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [iBurner]
    });

    // REJECT: place piece with same hand id
    await assert.rejects(async () => {
      await program.rpc.placePieceHidden(5, 0, 2, {
        accounts: {
          game: gamePDAKey,
          invoker: iBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [iBurner],
      });
    }, 'place piece with the same hand id as another one');

    await program.rpc.placePieceHidden(1, 2, 1, {
      accounts: {
        game: gamePDAKey,
        invoker: iBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [iBurner]
    });
    await program.rpc.placePieceHidden(7, 7, 0, {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner],
    });
    await program.rpc.placePieceHidden(6, 7, 4, {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner],
    });
    // REJECT: place piece on top of another one
    await assert.rejects(async () => {
      await program.rpc.placePieceHidden(6, 7, 2, {
        accounts: {
          game: gamePDAKey,
          invoker: oBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [oBurner],
      });
    }, 'place on top of other piece');

    await program.rpc.placePieceHidden(3, 4, 3, {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner],
    });
    const account = await program.account.game.fetch(gamePDAKey);
    
    // REJECT: place too many pieces
    await assert.rejects(async () => {
      await program.rpc.placePieceHidden(6, 6, 1, {
        accounts: {
          game: gamePDAKey,
          invoker: oBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [oBurner],
      });
    }, 'place too many pieces');

    assert.deepStrictEqual(account.entities.all[5],
      {
        id: 5,
        owner: { opponent: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 350, y: 450 },
        health: 0,
        unitType: { hidden: {handPosition: 3} },
        state: { idle: {} },
        stats: null,
        rarity: null,
      }, 'Incorrect pieces placed');
    assert.deepStrictEqual((account.entities.all as Array<any>).length, 6, 'Incorrect pieces placed');
  });

  it('move and remove pieces', async ()=>{
    await program.rpc.movePieceHidden(3, 5, 3, {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner],
    });
    const accountMove = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(accountMove.entities.all[5],
      {
        id: 5,
        owner: { opponent: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 350, y: 550 },
        health: 0,
        unitType: { hidden: {handPosition: 3} },
        state: { idle: {} },
        stats: null,
        rarity: null,
      }, 'Moved to wrong position');

      await program.rpc.removePieceHidden(0, {
        accounts: {
          game: gamePDAKey,
          invoker: oBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [oBurner],
      });
      const accountRemove = await program.account.game.fetch(gamePDAKey);
      assert.deepStrictEqual(accountRemove.entities.all[4], {
        id: 5,
        owner: { opponent: {} },
        target: null,
        speedMultiplier: 100,
        position: { x: 350, y: 550 },
        health: 0,
        unitType: { hidden: {handPosition: 3} },
        state: { idle: {} },
        stats: null,
        rarity: null,
      }, 'did not delete a piece');
      assert.deepStrictEqual((accountRemove.entities.all as Array<any>).length, 5, 'piece was not deleted');
  })

  it('lock in', async () => {
    await program.rpc.lockIn({
      accounts: {
        game: gamePDAKey,
        invoker: iBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [iBurner],
    });
    await assert.rejects(async () => {
      await program.rpc.revealSecond([...Buffer.from(initializerReveal2, 'hex')], [...Buffer.from(initializerSecret2, 'hex')], {
        accounts: {
          game: gamePDAKey,
          invoker: iBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [iBurner]
      });
    });
    await program.rpc.lockIn({
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner],
    }); 
  });

  it('reveal 2', async () => {
    await program.rpc.revealSecond([...Buffer.from(initializerReveal2, 'hex')], [...Buffer.from(initializerSecret2, 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: iBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [iBurner]
    });
    await assert.rejects(async () => {
      await program.rpc.revealSecond([...Buffer.from(initializerReveal2, 'hex')], [...Buffer.from(initializerSecret2, 'hex')], {
        accounts: {
          game: gamePDAKey,
          invoker: oBurner.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [oBurner]
      });
    });
    await program.rpc.revealSecond([...Buffer.from(opponentReveal2, 'hex')], [...Buffer.from(opponentSecret2, 'hex')], {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner]
    });
    const account = await program.account.game.fetch(gamePDAKey);
    assert.deepStrictEqual(account.reveal2, [
      107, 165,  64, 200,  92, 185, 127,
      157,  83, 226, 151,  38,  72, 206,
      255,  39, 127, 141, 243, 149, 183,
      111, 147,  17, 153, 208,  94, 122,
      173, 237, 221, 237
    ], 'Incorrect reveal');
    assert.deepStrictEqual(account.state, 3, 'Wrong state');
    for (const entity of account.entities.all as Array<any>) {
      assert(entity.unitType['hidden'] === undefined, "no hidden units left");
    }
  });

  it('crank', async ()=>{

    await program.rpc.crankGame(5, {
      accounts: {
        game: gamePDAKey,
        invoker: oBurner.publicKey,
      },
      signers: [oBurner],
    });
    const account = await program.account.game.fetch(gamePDAKey);
    console.log("pda account", account);
    assert.deepStrictEqual(account.winCondition, {inProgress: {} }, 'Wrong winner');
    // console.log(JSON.stringify(Uint8Array.from((await program.account.game.getAccountInfo(gamePDAKey)).data)))
  });
  it('reject incorrect claim', async ()=>{
    assert.rejects(async () => {
      await program.rpc.claimVictory({
        accounts: {
          game: gamePDAKey,
          invoker: opponent.publicKey,
          initializer: program.provider.wallet.publicKey,
          opponent: opponent.publicKey,
        },
        signers: [opponent],
      });
    });
  });

  it('crank to finality', async ()=>{

    for (let i = 0; i<15; i++) {
      await program.rpc.crankGame(5, {
        accounts: {
          game: gamePDAKey,
          invoker: iBurner.publicKey,
        },
        signers: [iBurner],
      });
    }
    for (let i = 0; i<3; i++) {
      await program.rpc.crankGame(20, {
        accounts: {
          game: gamePDAKey,
          invoker: iBurner.publicKey,
        },
        signers: [iBurner],
      });
    }
    const account = await program.account.game.fetch(gamePDAKey);
    console.log("entities", JSON.stringify(account.entities, null, 2));
    assert.deepStrictEqual(account.winCondition, {initializer: {} }, 'Wrong winner');
  });

  it('correct claim', async ()=>{
    const account = await program.account.game.getAccountInfo(program.provider.wallet.publicKey);
    let lamports = account.lamports;
    await program.rpc.claimVictory({
      accounts: {
        game: gamePDAKey,
        invoker: program.provider.wallet.publicKey,
        initializer: program.provider.wallet.publicKey,
        opponent: opponent.publicKey,
      },
    });
    lamports -= (await program.account.game.getAccountInfo(program.provider.wallet.publicKey)).lamports;
    assert.deepStrictEqual(lamports, -2005757888, 'Incorrect lamports deposited');
  });

  const inactiveGamePDA = (await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("game 3"),
      Buffer.from('Game'),
    ],
    program.programId
  ));
  const inactiveGameKey = inactiveGamePDA[0];

  it('claim inactivity fail!', async () => {
    await program.rpc.createGame(
      "game 3", 
      iBurner.publicKey.toBytes(),
      new anchor.BN(anchor.web3.LAMPORTS_PER_SOL), 
      initializerCommitment1, 
      initializerCommitment2, 
      {
        accounts: {
          game: inactiveGameKey,
          initializer: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
    });
    await program.rpc.joinGame(
      Array.from(oBurner.publicKey.toBytes()), opponentCommitment1, opponentCommitment2, {
      accounts: {
        game: inactiveGameKey,
        invoker: opponent.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [opponent]
    });

    await program.rpc.revealFirst([...Buffer.from(opponentReveal1, 'hex')], [...Buffer.from(opponentSecret1, 'hex')], {
      accounts: {
        game: inactiveGameKey,
        invoker: oBurner.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [oBurner]
    });

    assert.rejects(async () => {
      await program.rpc.claimInactivity({
        accounts: {
          game: inactiveGameKey,
          invoker: opponent.publicKey,
          initializer: program.provider.wallet.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [opponent]
      });
    });
  });
  xit('claim inactivity success test (may take a while)', (done)=>{
    setTimeout(async ()=>{
      console.log('tying to claim inactivity again');
      try{
        console.log(opponent.publicKey);
        await program.rpc.claimInactivity({
          accounts: {
            game: inactiveGameKey,
            invoker: opponent.publicKey,
            initializer: program.provider.wallet.publicKey,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          },
          signers: [opponent]
        });
        const accounts = await program.account.game.all();
        assert.deepStrictEqual(accounts.length, 0, 'accounts has not been closed');
        done();
      } catch(error) {
        console.log(error);
      }
    }, 61 * 1000)
  })
});
