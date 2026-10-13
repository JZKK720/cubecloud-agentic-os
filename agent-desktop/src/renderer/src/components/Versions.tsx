import { useState } from "react";
import { getRuntimeVersions } from "../utils/platform";

function Versions(): React.JSX.Element {
  // Runtime labels — blank in the browser shell, populated in Electron.
  const [versions] = useState(getRuntimeVersions);

  return (
    <ul className="versions">
      <li className="electron-version">Electron v{versions.electron}</li>
      <li className="chrome-version">Chromium v{versions.chrome}</li>
      <li className="node-version">Node v{versions.node}</li>
    </ul>
  );
}

export default Versions;
