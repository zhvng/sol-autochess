import { AppBar } from "components/AppBar";
import type { NextPage } from "next";
import Head from "next/head";
import { BasicsView } from "../views";

const Basics: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta
          name="description"
          content="Basic Functionality"
        />
      </Head>
      <AppBar/>
      <BasicsView />
    </div>
  );
};

export default Basics;
