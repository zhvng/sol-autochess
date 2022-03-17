import { AppBar } from "components/AppBar";
import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>sol autochess</title>
        <meta
          name="description"
          content="play solana autochess"
        />
      </Head>
      <AppBar/>
      <HomeView />
    </div>
  );
};

export default Home;
