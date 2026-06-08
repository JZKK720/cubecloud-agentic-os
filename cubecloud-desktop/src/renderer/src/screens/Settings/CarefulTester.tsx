import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import { useI18n } from "../../components/useI18n";

interface CarefulResult {
  verdict: "safe" | "warn" | "block";
  reason?: string;
  matchedPattern?: string;
  softerAlternative?: string;
}

interface CarefulTesterProps {
  profile?: string;
}

/**
 * V2 Step 9 — /careful guard tester.
 *
 * The main entry-point for /careful is the dispatch path: the
 * plans-dispatch IPC runs the body through checkCareful and returns
 * a `careful` field on the result when destructive commands are
 * detected. That warning already surfaces in the Plans screen.
 *
 * This component is a smaller ad-hoc test panel so the user can
 * verify the matcher against arbitrary commands without going
 * through plan-dispatch. Useful for tuning the safety.ts patterns
 * during development.
 */
export function CarefulTester({}: CarefulTesterProps): React.JSX.Element {
  const { t: _t } = useI18n();
  const [command, setCommand] = useState("rm -rf ./build");
  const [body, setBody] = useState("");
  const [cmdResult, setCmdResult] = useState<CarefulResult | null>(null);
  const [bodyHit, setBodyHit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCommand = useCallback(async () => {
    if (!command.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = (await window.hermesAPI.carefulCheck(
        command,
      )) as CarefulResult;
      setCmdResult(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [command]);

  const checkBody = useCallback(async () => {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await window.hermesAPI.carefulFindInBody(body);
      setBodyHit(typeof r === "string" ? r : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [body]);

  useEffect(() => {
    void checkCommand();
  }, [checkCommand]);

  return (
    <div className="careful-tester">
      <div className="careful-tester-row">
        <label>
          <span>Single command</span>
          <div className="careful-tester-input">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="rm -rf /"
              onKeyDown={(e) => {
                if (e.key === "Enter") void checkCommand();
              }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void checkCommand()}
              disabled={busy || !command.trim()}
            >
              Check
            </button>
          </div>
        </label>
      </div>

      {cmdResult && <CarefulVerdict result={cmdResult} command={command} />}

      <div className="careful-tester-row">
        <label>
          <span>Body scan (fenced code blocks)</span>
          <div className="careful-tester-input">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={
                "## Setup\n\n```bash\nrm -rf ./build\n```\n\nThen run tests."
              }
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void checkBody()}
              disabled={busy || !body.trim()}
            >
              Find
            </button>
          </div>
        </label>
      </div>

      {bodyHit !== null && (
        <div className="careful-tester-body-hit">
          {bodyHit ? (
            <>
              <strong>First destructive command found:</strong>{" "}
              <code>{bodyHit}</code>
            </>
          ) : (
            <em>No destructive commands in body.</em>
          )}
        </div>
      )}

      {error && <div className="careful-tester-error">{error}</div>}
    </div>
  );
}

function CarefulVerdict({
  result,
  command,
}: {
  result: CarefulResult;
  command: string;
}) {
  const cls = `careful-verdict careful-verdict-${result.verdict}`;
  const Icon =
    result.verdict === "block"
      ? ShieldAlert
      : result.verdict === "warn"
        ? AlertTriangle
        : Shield;
  return (
    <div className={cls}>
      <div className="careful-verdict-head">
        <Icon size={14} />
        <strong>{result.verdict.toUpperCase()}</strong>
        <code className="careful-verdict-cmd">{command}</code>
      </div>
      {result.matchedPattern && (
        <p>
          <span className="careful-verdict-label">Matched pattern:</span>{" "}
          <code>{result.matchedPattern}</code>
        </p>
      )}
      {result.reason && (
        <p>
          <span className="careful-verdict-label">Why:</span> {result.reason}
        </p>
      )}
      {result.softerAlternative && (
        <p>
          <span className="careful-verdict-label">Safer alternative:</span>{" "}
          <code>{result.softerAlternative}</code>
        </p>
      )}
    </div>
  );
}

export default CarefulTester;
