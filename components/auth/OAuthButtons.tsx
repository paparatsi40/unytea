"use client";

import { Chrome, Github } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OAuthProviderId } from "@/lib/auth-providers";

/**
 * The OAuth block of the sign-in and sign-up cards.
 *
 * `providers` comes from the server, derived from `configuredOAuthProviders()`
 * — the same function `lib/auth.ts` uses to decide what to register. The list
 * is therefore never a hardcoded set of buttons: a provider without credentials
 * is absent from the array and simply is not rendered.
 *
 * With no providers at all the component renders nothing, divider included, so
 * the card degrades to a plain email-and-password form instead of an empty box
 * above an "or continue with" rule.
 */

const PROVIDER_ICONS: Record<OAuthProviderId, typeof Chrome> = {
  google: Chrome,
  github: Github,
};

const PROVIDER_LABEL_KEYS: Record<OAuthProviderId, string> = {
  google: "auth.continueWithGoogle",
  github: "auth.continueWithGitHub",
};

interface OAuthButtonsProps {
  /** Provider ids that are actually registered, in display order. */
  providers: OAuthProviderId[];
  /** Copy for the rule separating OAuth from the email form. */
  dividerLabel: string;
  disabled?: boolean;
  onSelect: (provider: OAuthProviderId) => void;
}

export function OAuthButtons({
  providers,
  dividerLabel,
  disabled = false,
  onSelect,
}: OAuthButtonsProps) {
  const t = useTranslations();

  if (providers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6 space-y-3">
        {providers.map((provider) => {
          const Icon = PROVIDER_ICONS[provider];
          return (
            <button
              key={provider}
              type="button"
              onClick={() => onSelect(provider)}
              disabled={disabled}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all hover:border-purple-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon className="h-5 w-5 text-gray-700 transition-colors group-hover:text-purple-600" />
              <span className="font-medium text-gray-700">{t(PROVIDER_LABEL_KEYS[provider])}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">{dividerLabel}</span>
        </div>
      </div>
    </>
  );
}
