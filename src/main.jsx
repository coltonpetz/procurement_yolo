import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";

import ProjectList from "./pages/ProjectList.jsx";
import ProjectCreate from "./pages/ProjectCreate.jsx";
import ProjectLayout from "./pages/ProjectLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProcurementLog from "./pages/ProcurementLog.jsx";
import BuyoutLog from "./pages/BuyoutLog.jsx";

const router = createBrowserRouter([
  { path: "/", element: <ProjectList /> },
  { path: "/projects/new", element: <ProjectCreate /> },
  {
    path: "/projects/:projectId",
    element: <ProjectLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "log", element: <ProcurementLog /> },
      { path: "buyout", element: <BuyoutLog /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
