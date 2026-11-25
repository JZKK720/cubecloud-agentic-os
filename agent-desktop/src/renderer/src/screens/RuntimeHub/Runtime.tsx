import { useEffect, useState } from "react";
import {
  ClickableCard,
  Heading,
  Text,
  VStack,
  HStack,
  IconButton,
} from "@astryxdesign/core";
import { Check, Copy, Pin, PinOff } from "lucide-react";
import { useI18n } from "../../components/useI18n";
import {
  RUNTIME_GROUPS,
  type RuntimePane,
  MAX_RAIL_PINS,
} from "./catalog";
import { useRuntimePins } from "./useRuntimePins";

export type { RuntimePane } from "./catalog";
export type RuntimePins = ReturnType<typeof useRuntimePins>;

interface RuntimeHubProps {
  onNavigate: (view: RuntimePane) => void;
  /** Shared with the rail so a pin toggled here lights up there immediately. */
  pins: RuntimePins;
}

export default function Runtime({
  onNavigate,
  pins: pinsState,
}: RuntimeHubProps): React.JSX.Element {
  const { t } = useI18n();
  const { pins, isPinned, togglePin } = pinsState;
  const [copied, setCopied] = useState<RuntimePane | null>(null);

  useEffect(() => {
    document.title = `Cubecloud · ${t("runtime.title")}`;
  }, [t]);

  useEffect(() => {
    if (!copied) return undefined;
    const handle = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(handle);
  }, [copied]);

  const copyInstall = async (
    view: RuntimePane,
    command: string,
  ): Promise<void> => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(view);
    } catch {
      // Clipboard may be unavailable (denied or non-secure context);
      // the command stays visible so the operator can select it manually.
      setCopied(null);
    }
  };

  return (
    <div className="runtime-hub" role="region" aria-label={t("runtime.title")}>
      <header className="runtime-hub-header">
        <Heading level={1}>{t("runtime.title")}</Heading>
        <Text type="supporting" color="secondary">
          {t("runtime.subtitle")}
        </Text>
      </header>

      <div className="runtime-hub-groups">
        {RUNTIME_GROUPS.map((group) => (
          <section key={group.labelKey} className="runtime-hub-group">
            <Text
              type="label"
              color="secondary"
              className="runtime-hub-group-label"
            >
              {t(`runtime.${group.labelKey}`).toUpperCase()}
            </Text>
            <div className="runtime-hub-grid">
              {group.cards.map(
                ({
                  view,
                  icon: Icon,
                  titleKey,
                  descKey,
                  installCommand,
                  needsApiKey,
                }) => {
                  const pinned = isPinned(view);
                  const isCopied = copied === view;
                  return (
                    <ClickableCard
                      key={view}
                      label={t(`runtime.${titleKey}`)}
                      onClick={() => onNavigate(view)}
                      padding={3}
                      elevation="none"
                    >
                      <VStack gap={2} align="start">
                        <HStack
                          gap={2}
                          align="center"
                          style={{ alignSelf: "stretch" }}
                        >
                          <span className="runtime-hub-icon" aria-hidden="true">
                            <Icon size={18} strokeWidth={1.75} />
                          </span>
                          <Text weight="bold">{t(`runtime.${titleKey}`)}</Text>
                          <span className="runtime-hub-pin">
                            <IconButton
                              size="sm"
                              variant="ghost"
                              label={
                                pinned
                                  ? t("runtime.unpinFromRail")
                                  : t("runtime.pinToRail")
                              }
                              icon={
                                pinned ? <PinOff size={14} /> : <Pin size={14} />
                              }
                              isDisabled={!pinned && pins.length >= MAX_RAIL_PINS}
                              onClick={() => togglePin(view)}
                            />
                          </span>
                        </HStack>

                        <Text type="supporting" color="secondary">
                          {t(`runtime.${descKey}`)}
                        </Text>

                        {installCommand && (
                          <div className="runtime-hub-install">
                            <code
                              className="runtime-hub-install-command"
                              title={installCommand}
                            >
                              {installCommand}
                            </code>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              label={
                                isCopied
                                  ? t("runtime.installCopied")
                                  : t("runtime.installCommand")
                              }
                              icon={
                                isCopied ? <Check size={14} /> : <Copy size={14} />
                              }
                              onClick={() => {
                                void copyInstall(view, installCommand);
                              }}
                            />
                            {needsApiKey && (
                              <span className="runtime-hub-install-note">
                                {t("runtime.needsApiKey")}
                              </span>
                            )}
                          </div>
                        )}
                      </VStack>
                    </ClickableCard>
                  );
                },
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
