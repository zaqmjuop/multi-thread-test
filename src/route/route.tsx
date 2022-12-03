import { createBrowserRouter, Router } from "react-router-dom";
import Overview from "../pages/Overview";
import WorkerTest1 from "../pages/WorkerTest1";
import WorkerTest2 from "../pages/WorkerTest2";
import WorkerTest3 from "../pages/WorkerTest3";

export const workerTests = [
  {
    path: "/workerTest1",
    element: <WorkerTest1 />,
  },
  {
    path: "/workerTest2",
    element: <WorkerTest2 />,
  },
  {
    path: "/workerTest3",
    element: <WorkerTest3 />,
  },
];

const routes = createBrowserRouter([
  {
    path: "/",
    element: <Overview />,
  },
  ...workerTests,
]);
export default routes;
