import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Heading,
  Text,
  HStack,
  VStack,
  StatusDot,
  Skeleton,
} from "@astryxdesign/core";
import { ArrowRight, ChatBubble, Clock, Plans } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";

export type HomeDestination =
  | "chat"
  | "sessions"
  | "plans"
  | "settings";

interface HomeProps {
  onNavigate: (dest: HomeDestination) => void;
}

interface RuntimeInfo {
  connected: boolean;
  endpoint: string | null;
  mode: "local" | "remote" | "ssh" | "unknown";
}

function useRuntimeProbe(): [RuntimeInfo | null, boolean] {
  const [info, setInfo] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await window.hermesAPI
          .getConnectionConfig()
          .catch(() => null);
        const mode = config?.mode ?? "unknown";
        if (mode === "local") {
          // In local mode `gatewayStatus()` reports only the locally
          // spawned gateway, which is false when the operator runs
          // their own Hermes outside this app. Surface "local" as the
          // mode rather than a false "offline".
          if (!cancelled) {
            setInfo({ connected: true, endpoint: null, mode });
            setLoading(false);
          }
          return;
        }
        const connected = await window.hermesAPI.gatewayStatus();
        if (cancelled) return;
        setInfo({
          connected: Boolean(connected),
          endpoint: config?.remoteUrl?.trim() ? config.remoteUrl.trim() : null,
          mode,
        });
      } catch {
        if (!cancelled) setInfo({ connected: false, endpoint: null, mode: "unknown" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return [info, loading];
}

export default function Home({ onNavigate }: HomeProps): React.JSX.Element {
  const { t } = useI18n();
  const [runtime, runtimeLoading] = useRuntimeProbe();

  const statusDot = useMemo(() => {
    if (runtimeLoading || !runtime) return "neutral" as const;
    return runtime.connected ? ("success" as const) : ("error" as const);
  }, [runtime, runtimeLoading]);

  const runtimeLabel = runtimeLoading
    ? t("home.checkingRuntime")
    : runtime?.connected
      ? t("home.runtimeReady")
      : t("home.runtimeOffline");

  const runtimeDetail = runtimeLoading
    ? undefined
    : runtime?.mode === "remote" || runtime?.mode === "ssh"
      ? runtime.endpoint
        ? t("home.runtimeDetailRemote", { url: runtime.endpoint })
        : t("home.runtimeDetailDown")
      : runtime?.mode === "local"
        ? t("home.runtimeDetailLocal")
        : t("home.runtimeDetailDown");

  return (
    <main className="home" aria-label={t("home.title")}>
      <VStack gap={4}>
        <header className="home-header">
          <VStack gap={1}>
            <Heading level={1} type="display-2">
              {t("home.title")}
            </Heading>
            <Text type="supporting" color="secondary">
              {t("home.subtitle")}
            </Text>
          </VStack>
          <div className="home-runtime" data-testid="home-runtime">
            {runtimeLoading ? (
              <Skeleton height={20} width={180} />
            ) : (
              <HStack gap={2} align="center">
                <StatusDot variant={statusDot} label={runtimeLabel} />
                <div>
                  <Text type="body" weight="medium">
                    {runtimeLabel}
                  </Text>
                  {runtimeDetail ? (
                    <Text type="supporting" color="secondary">
                      {runtimeDetail}
                    </Text>
                  ) : null}
                </div>
              </HStack>
            )}
          </div>
        </header>

        <HStack gap={4} className="home-actions">
          <Card padding={5} className="home-action-card">
            <VStack gap={2}>
              <ChatBubble size={22} />
              <Text type="label">{t("home.newChatTitle")}</Text>
              <Text type="supporting" color="secondary">
                {t("home.newChatBody")}
              </Text>
              <Button
                label={t("home.newChatAction")}
                variant="primary"
                onClick={() => onNavigate("chat")}
                icon={<ArrowRight size={16} />}
              />
            </VStack>
          </Card>

          <Card padding={5} className="home-action-card">
            <VStack gap={2}>
              <Clock size={22} />
              <Text type="label">{t("home.resumeTitle")}</Text>
              <Text type="supporting" color="secondary">
                {t("home.resumeBody")}
              </Text>
              <Button
                label={t("home.resumeAction")}
                variant="secondary"
                onClick={() => onNavigate("sessions")}
                icon={<ArrowRight size={16} />}
              />
            </VStack>
          </Card>

          <Card padding={5} className="home-action-card">
            <VStack gap={2}>
              <Plans size={22} />
              <Text type="label">{t("home.approvalsTitle")}</Text>
              <Text type="supporting" color="secondary">
                {t("home.approvalsBody")}
              </Text>
              <Button
                label={t("home.approvalsAction")}
                variant="secondary"
                onClick={() => onNavigate("plans")}
                icon={<ArrowRight size={16} />}
              />
            </VStack>
          </Card>
        </HStack>

        <Card padding={4}>
          <HStack gap={3} align="center" justify="between">
            <VStack gap={1}>
              <Text type="label">{t("home.guidedTitle")}</Text>
              <Text type="supporting" color="secondary">
                {t("home.guidedBody")}
              </Text>
            </VStack>
            <Button
              label={t("home.guidedAction")}
              variant="ghost"
              onClick={() => onNavigate("settings")}
              icon={<ArrowRight size={16} />}
            />
          </HStack>
        </Card>
      </VStack>
    </main>
  );
}
