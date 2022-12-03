import React from "react";
import WorkerTemplate from "../component/WorkerTemplate";
import { lzwDecode } from "../utils/lzwDecode";
import lzwData from "./lzwData";

const simpleFunc = lzwDecode;
const args = [8, lzwData];
const testData = { simpleFunc, args };

class WorkerTest3 extends React.Component {
  render() {
    return (
      <div>
        <WorkerTemplate testData={testData} title={"WorkerTest3"} />
      </div>
    );
  }
}

export default WorkerTest3;
