import { AppBar } from "components/AppBar";
import type { NextPage } from "next";
import Head from "next/head";
import { RulesView } from "../views";

const Rules: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>units</title>
        <meta
          name="description"
          content="unit descriptions"
        />
      </Head>
      <AppBar/>
      <RulesView />
    </div>
  );
};

export default Rules;
