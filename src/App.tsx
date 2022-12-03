import React, { ReactElement, useState } from "react";
import "./App.css";

const App: React.FunctionComponent<{
  children: ReactElement | ReactElement[];
}> = (props) => {

  return <div className="App">{props.children}</div>;
};

export default App;
