import { RouterProvider } from "react-router";
import type { RuntimeConfig } from "../config/runtime-config";
import { createRemotes } from "../integrations/remotes/register-remotes";
import { HostProvider } from "../providers/host-provider";
import { createRouter } from "../routes/router";

export function createApp(config: RuntimeConfig) {
  const router = createRouter(config, createRemotes(config));
  return function App() {
    return (
      <HostProvider apiBaseUrl={config.apiBaseUrl}>
        <RouterProvider router={router} />
      </HostProvider>
    );
  };
}
