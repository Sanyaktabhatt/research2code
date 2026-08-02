/** Maps the `oauth_error` reason codes the backend redirects with (see backend/app/api/v1/endpoints/auth.py's `oauth_callback`) to user-facing text. */
const MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  state_mismatch: "That sign-in link expired or was already used. Please try again.",
  provider_not_configured: "That sign-in method isn't available right now.",
  exchange_failed: "We couldn't complete sign-in with that provider. Please try again.",
  inactive_account: "This account has been deactivated.",
  unknown_error: "Something went wrong signing you in. Please try again.",
};

export function oauthErrorMessage(reason: string | null): string | null {
  if (!reason) return null;
  return MESSAGES[reason] ?? MESSAGES.unknown_error!;
}
