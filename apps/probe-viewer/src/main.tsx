import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";

// =============================================================================
// GitHub Pages SPA Redirect Handler
// =============================================================================
//
// WHAT THIS DOES:
// When 404.html redirects here, it may have saved a route in sessionStorage.
// For example, if the user visited:
//   /apps/probe-viewer/probes/imec/NP1000
//
// GitHub served 404.html, which saved "/probes/imec/NP1000" and redirected
// to /apps/probe-viewer/. Now we're here at the root.
//
// This code:
// 1. Checks if there's a saved route
// 2. Removes it from storage (so refresh works normally)
// 3. Replaces the current URL with the intended route
//
// We do this BEFORE creating the router so React Router sees the correct URL.
// =============================================================================

const REDIRECT_KEY = "spa-redirect-route";
const savedRoute = sessionStorage.getItem(REDIRECT_KEY);

if (savedRoute) {
  sessionStorage.removeItem(REDIRECT_KEY);
  // Replace the current history entry so "back" doesn't go to the redirect
  // We use replaceState to update the URL without a navigation
  const newUrl = import.meta.env.BASE_URL + savedRoute.replace(/^\//, "");
  window.history.replaceState(null, "", newUrl);
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
    },
    {
      path: "/probes/:manufacturer/:model",
      element: <App />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
