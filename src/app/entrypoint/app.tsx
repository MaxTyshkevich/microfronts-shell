import { RouterProvider } from "react-router/dom";
import { config } from "../config/config";
import { registerMicrofrontends } from "../integrations/remotes/register-remotes";
import { HostProvider } from "../providers/host-provider";
import { createRouter } from "../routes/router";

// Initialize outside React rendering, including StrictMode re-renders.
const microfrontends = registerMicrofrontends(config);
const router = createRouter(microfrontends);

export function App() {
  return (
    <HostProvider>
      <RouterProvider router={router} />
    </HostProvider>
  );
}
