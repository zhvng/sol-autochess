import { Idl, Program, Provider } from '@project-serum/anchor';
import { AnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js'
import { useEffect, useState } from 'react';
import idl from '../idl/autochess.json';

export function getProgram (
  wallet: AnchorWallet,
  connection: Connection,
) {
  const programID = new PublicKey((idl as Idl).metadata.address);
  const provider = new Provider(
    connection, wallet, {commitment: 'confirmed'},
  )
  const program = new Program(idl as Idl, programID, provider);
  return program
}
