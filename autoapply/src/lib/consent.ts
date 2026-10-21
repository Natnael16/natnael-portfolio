export function isConsentPrompt(label: string, path = ""): boolean {
  const blob = `${path} ${label}`.toLowerCase();
  return /consent|i agree|i certify|gdpr|privacy policy|by checking this box|attest|personal data|recruitment policy/.test(
    blob,
  );
}

export function isMarketingOptInPrompt(label: string, path = ""): boolean {
  const blob = `${path} ${label}`.toLowerCase();
  if (/privacy|personal data|gdpr|by checking this box/.test(blob)) return false;
  return /\b(whatsapp|sms|text messages?|newsletter)\b/.test(blob);
}

export function shouldTickConsent(
  field: { path: string; label: string; required: boolean; inputKind?: string },
  profile: { gdprConsent?: boolean; attestTruth?: boolean },
): boolean {
  if (field.required) return true;
  if (isMarketingOptInPrompt(field.label, field.path)) return Boolean(profile.gdprConsent);
  if (/i certify|attest|information is (true|accurate)/i.test(`${field.path} ${field.label}`)) {
    return Boolean(profile.attestTruth);
  }
  if (isConsentPrompt(field.label, field.path)) return Boolean(profile.gdprConsent || profile.attestTruth);
  return false;
}

