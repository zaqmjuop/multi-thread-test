import React from "react";
import { Link } from "react-router-dom";
import { workerTests } from "../route/route";
import './Overview.scss'

class Overview extends React.Component {
  render() {
    const workerTestLinks = workerTests.map((item) => {
      return <Link className="link-item" to={item.path}>{item.path}</Link>;
    });
    return (
      <div className="overview">
        <h1>Overview</h1>

        {workerTestLinks}
      </div>
    );
  }
}

export default Overview;
