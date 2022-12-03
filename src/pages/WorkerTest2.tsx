import React from "react";
import WorkerTemplate from "../component/WorkerTemplate";

const simpleFunc = (mesc = 500) => {
  const now = Date.now();
  while (Date.now() - now < mesc) {}
};
const args: any[] = [];
const testData = { simpleFunc, args };

class WorkerTest2 extends React.Component {
  render() {
    return (
      <div>
        <WorkerTemplate testData={testData} title={'WorkerTest2'} />
      </div>
    );
  }
}

export default WorkerTest2;
