import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../components/useI18n";

interface SchemaTypeShape {
  id: string;
  label: string;
  description: string;
  pathPrefixes: string[];
  extractable: boolean;
  expertRouting: boolean;
  recommendedFields?: string[];
}

interface SchemaPackShape {
  id: string;
  label: string;
  version: string;
  description: string;
  extends?: string;
  types: SchemaTypeShape[];
  globalTags?: string[];
}

interface SchemasSectionProps {
  profile?: string;
}

export function SchemasSection({
  profile,
}: SchemasSectionProps): React.JSX.Element {
  const { t } = useI18n();
  const [packs, setPacks] = useState<SchemaPackShape[]>([]);
  const [active, setActive] = useState<SchemaPackShape | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferPath, setInferPath] = useState("people/alice.md");
  const [inferResult, setInferResult] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [all, activePack] = await Promise.all([
        window.hermesAPI.schemasListBundled(),
        window.hermesAPI.schemasGetActive(profile),
      ]);
      setPacks(all as SchemaPackShape[]);
      setActive(activePack as SchemaPackShape);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleActivate(packId: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await window.hermesAPI.schemasSetActive(packId, profile);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleInfer(): Promise<void> {
    if (!inferPath.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ty = await window.hermesAPI.schemasInferType(
        inferPath.trim(),
        profile,
      );
      setInferResult(ty);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        {t("settings.schemas.sectionTitle")}
      </div>
      <div
        className="settings-field-hint"
        style={{ marginBottom: 12, lineHeight: 1.5 }}
      >
        {t("settings.schemas.sectionHint")}
      </div>

      {error && <div className="settings-error">{error}</div>}

      <div className="schemas-pack-list">
        {packs.map((pack) => {
          const isActive = active?.id === pack.id;
          return (
            <div
              key={pack.id}
              className={`schemas-pack-card ${isActive ? "schemas-pack-active" : ""}`}
            >
              <div className="schemas-pack-header">
                <div>
                  <div className="schemas-pack-name">{pack.label}</div>
                  <div className="schemas-pack-id">
                    <code>{pack.id}</code> ·{" "}
                    {t("settings.schemas.version", {
                      version: pack.version,
                    })}
                    {pack.extends && (
                      <span className="schemas-pack-extends">
                        {" "}
                        extends {pack.extends}
                      </span>
                    )}
                  </div>
                </div>
                {isActive ? (
                  <span className="schemas-pack-badge-active">
                    {t("settings.schemas.currentActive")}
                  </span>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleActivate(pack.id)}
                    disabled={busy}
                  >
                    {t("settings.schemas.activate")}
                  </button>
                )}
              </div>
              <div className="schemas-pack-desc">{pack.description}</div>
              <div className="schemas-pack-types">
                <strong>
                  {t("settings.schemas.types", {
                    count: pack.types.length,
                  })}
                </strong>
                <ul className="schemas-type-list">
                  {pack.types.map((ty) => (
                    <li key={ty.id} className="schemas-type-row">
                      <div className="schemas-type-head">
                        <code className="schemas-type-id">{ty.id}</code>
                        <span className="schemas-type-label">{ty.label}</span>
                        {ty.extractable && (
                          <span className="schemas-type-flag schemas-type-extract">
                            extractable
                          </span>
                        )}
                        {ty.expertRouting && (
                          <span className="schemas-type-flag schemas-type-routing">
                            expert-routing
                          </span>
                        )}
                      </div>
                      {ty.description && (
                        <p className="schemas-type-desc">{ty.description}</p>
                      )}
                      {ty.pathPrefixes.length > 0 && (
                        <div className="schemas-type-prefixes">
                          {ty.pathPrefixes.map((p) => (
                            <code key={p} className="schemas-prefix">
                              {p}
                            </code>
                          ))}
                        </div>
                      )}
                      {ty.recommendedFields &&
                        ty.recommendedFields.length > 0 && (
                          <div className="schemas-type-fields">
                            fields:{" "}
                            {ty.recommendedFields.map((f, i) => (
                              <code key={f} className="schemas-field">
                                {f}
                                {i < ty.recommendedFields!.length - 1
                                  ? ","
                                  : ""}
                              </code>
                            ))}
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              </div>
              {pack.globalTags && pack.globalTags.length > 0 && (
                <div className="schemas-pack-tags">
                  <strong>{t("settings.schemas.globalTags")}:</strong>{" "}
                  {pack.globalTags.map((tag) => (
                    <code key={tag} className="schemas-tag">
                      {tag}
                    </code>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="settings-field" style={{ marginTop: 16 }}>
        <label className="settings-field-label">
          {t("settings.schemas.inferTitle")}
        </label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            className="input"
            value={inferPath}
            onChange={(e) => setInferPath(e.target.value)}
            placeholder={t("settings.schemas.inferPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleInfer();
            }}
          />
          <button
            className="btn btn-secondary"
            onClick={() => void handleInfer()}
            disabled={busy || !inferPath.trim()}
          >
            {t("settings.schemas.inferButton")}
          </button>
        </div>
        {inferResult && (
          <div className="settings-field-value" style={{ marginTop: 6 }}>
            {t("settings.schemas.inferResult", { type: inferResult })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SchemasSection;
