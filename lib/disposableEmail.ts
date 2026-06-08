/**
 * Disposable / throwaway email blocking for the contact form.
 *
 * This is a curated list of the most common disposable-email providers,
 * not an exhaustive one. It catches the overwhelming majority of
 * throwaway addresses with zero dependencies and no network call. If you
 * later want full coverage, swap in the `disposable-email-domains`
 * package (a maintained list of several thousand domains).
 */
const DISPOSABLE_DOMAINS = new Set<string>([
  "0815.ru",
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "1secmail.com",
  "1secmail.net",
  "1secmail.org",
  "33mail.com",
  "anonbox.net",
  "burnermail.io",
  "byom.de",
  "dispostable.com",
  "discard.email",
  "discardmail.com",
  "einrot.com",
  "emailondeck.com",
  "emailtemporario.com.br",
  "fakeinbox.com",
  "fakemail.net",
  "fakemailgenerator.com",
  "getairmail.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "harakirimail.com",
  "inboxbear.com",
  "inboxkitten.com",
  "jetable.org",
  "kurzepost.de",
  "luxusmail.org",
  "mail-temp.com",
  "mail7.io",
  "mailcatch.com",
  "maildrop.cc",
  "maileater.com",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mailpoof.com",
  "mailsac.com",
  "mailtemp.info",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mvrht.com",
  "mytemp.email",
  "nada.email",
  "nwytg.net",
  "owlymail.com",
  "pokemail.net",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "tempail.com",
  "tempinbox.com",
  "tempmail.com",
  "tempmail.net",
  "tempmail.plus",
  "tempmailo.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempr.email",
  "throwawaymail.com",
  "tmpmail.net",
  "tmpmail.org",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "wegwerfmail.de",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** Lowercased domain part of an email, or "" if it can't be parsed. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
