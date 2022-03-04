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
      program.provider.wallet.publicKey.toBuffer(),
      Buffer.from('Game', 'utf-8'),
    ],
    program.programId
  ))[0];
  console.log(gamePDA)
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
    // Add your test here.
    const tx = await program.rpc.createGame(initializerCommitment1, [...Buffer.from(hash(initializerReveal2), 'hex')], {
      accounts: {
        game: gamePDA,
        initializer: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    console.log("Your transaction signature", tx);
  });

  it('joins!', async () => {
    // Add your test here.
    const tx = await program.rpc.joinGame(opponentCommitment1, [...Buffer.from(hash(opponentReveal2), 'hex')], {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent]
    });
    console.log("Your transaction signature", tx);
  });

  it('reveals!', async () => {
    // Add your test here.
    const tx = await program.rpc.revealFirst([...Buffer.from(opponentReveal1, 'hex')], [...Buffer.from(opponentSecret1, 'hex')], {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent]
    });
    const account = await program.account.game.fetch(gamePDA);
    console.log("pda account", account);
  });

  it('error when trying to repeat reveal', async () => {
    assert.rejects(async () => {
      await program.rpc.revealFirst([...Buffer.from(initializerReveal1, 'hex')], {
        accounts: {
          game: gamePDA,
          invoker: opponent.publicKey,
        },
        signers: [opponent]
      });
    });
  });

  it('finish reveal', async () => {
    const tx = await program.rpc.revealFirst([...Buffer.from(initializerReveal1, 'hex')], [...Buffer.from(initializerSecret1, 'hex')], {
      accounts: {
        game: gamePDA,
        invoker: program.provider.wallet.publicKey,
      }
    });
    const account = await program.account.game.fetch(gamePDA);
    console.log("pda account", account);
  });

  it('place piece', async () => {
    const tx = await program.rpc.placePiece(1, 1, UnitType.Wolf, {
      accounts: {
        game: gamePDA,
        invoker: program.provider.wallet.publicKey,
      }
    });
    await program.rpc.placePiece(1, 2, UnitType.Wolf, {
      accounts: {
        game: gamePDA,
        invoker: program.provider.wallet.publicKey,
      }
    });
    await program.rpc.placePiece(0, 1, UnitType.Wolf, {
      accounts: {
        game: gamePDA,
        invoker: program.provider.wallet.publicKey,
      }
    });
    const account = await program.account.game.fetch(gamePDA);
    console.log("pda account", account);
  });

  it('place piece 2', async () => {
    const tx = await program.rpc.placePiece(7, 7, UnitType.Wolf, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.placePiece(6, 7, UnitType.Bear, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.placePiece(3, 5, UnitType.Bull, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    const account = await program.account.game.fetch(gamePDA);
    console.log("pda account", account);
    console.log(account.entities.all);
  });

  it('crank', async ()=>{
    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    const account1 = await program.account.game.fetch(gamePDA);
    console.log("pda account", account1);
    console.log(JSON.stringify(account1.entities.all, null, 2));

    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    await program.rpc.crankGame(4, {
      accounts: {
        game: gamePDA,
        invoker: opponent.publicKey,
      },
      signers: [opponent],
    });
    const account = await program.account.game.fetch(gamePDA);
    console.log("pda account", account);
    console.log(JSON.stringify(account.entities.all, null, 2));
  });
});
