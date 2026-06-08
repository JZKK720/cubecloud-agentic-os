import RuntimeNotice from "./RuntimeNotice";

interface RemoteNoticeProps {
  feature: string;
}

// Backwards-compat shim — the old RemoteNotice only said the feature
// was unavailable in remote mode with no path forward. Route to
// RuntimeNotice so older imports keep working.
function RemoteNotice({ feature }: RemoteNoticeProps): React.JSX.Element {
  return <RuntimeNotice feature={feature} variant="remote" />;
}

export default RemoteNotice;
