// Textos de los correos (en inglés, como la app). Cada uno con versión de texto y HTML sencillo.
export interface Mail { subject: string; text: string; html: string; link?: string }

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, lines: string[], button?: { label: string; url: string }, foot?: string): string {
  const p = lines.map((l) => `<p style="margin:0 0 12px;font:16px/24px Roboto,Arial,sans-serif;color:#1b1b1f">${esc(l)}</p>`).join('');
  const b = button ? `<p style="margin:20px 0"><a href="${esc(button.url)}" style="display:inline-block;padding:12px 24px;border-radius:20px;background:#3f48cc;color:#fff;font:500 14px Roboto,Arial,sans-serif;text-decoration:none">${esc(button.label)}</a></p><p style="margin:0 0 12px;font:12px/16px Roboto,Arial,sans-serif;color:#46464f">If the button doesn’t work, copy this link: ${esc(button.url)}</p>` : '';
  const f = foot ? `<p style="margin:24px 0 0;font:12px/16px Roboto,Arial,sans-serif;color:#46464f">${esc(foot)}</p>` : '';
  return `<div style="max-width:480px;margin:0 auto;padding:24px"><p style="margin:0 0 20px;font:500 22px Roboto,Arial,sans-serif;color:#1b1b1f">My GDD · ${esc(title)}</p>${p}${b}${f}</div>`;
}
function mail(subject: string, lines: string[], button?: { label: string; url: string }, foot?: string): Mail {
  const text = [...lines, ...(button ? ['', `${button.label}: ${button.url}`] : []), ...(foot ? ['', foot] : [])].join('\n');
  return { subject, text, html: layout(subject, lines, button, foot), link: button?.url };
}

export const verifyMail = (name: string, url: string): Mail =>
  mail('Verify your email', [`Hi ${name}, welcome to My GDD!`, 'Verify your email to invite people to your team and to join other teams.'], { label: 'Verify my email', url }, 'The link works for 48 hours. If you didn’t create an account, ignore this email.');

export const resetMail = (url: string): Mail =>
  mail('Create a new password', ['We got a request to create a new password for your My GDD account.'], { label: 'Create a new password', url }, 'The link works for 1 hour and only once. If you didn’t ask for it, ignore this email: your password doesn’t change.');

export const passwordChangedMail = (name: string): Mail =>
  mail('Your password was changed', [`Hi ${name}, the password of your My GDD account was just changed.`, 'You were logged out of your other devices.'], undefined, 'If it wasn’t you, use “Forgot password?” on the log in screen right away.');

export const inviteMail = (from: string, projects: string[], url: string): Mail =>
  mail(`${from} invited you to My GDD`, [`${from} invited you to their team on My GDD${projects.length ? ' to work on ' + projects.join(', ') : ''}.`, 'Log in or create an account with this email. You’ll find the invitation in Notes.'], { label: 'Open My GDD', url });

export const emailChangeMail = (name: string, url: string): Mail =>
  mail('Confirm your new email', [`Hi ${name}, confirm that this is the new email of your My GDD account.`], { label: 'Confirm my new email', url }, 'The link works for 48 hours. Until you confirm it, your account keeps the old email.');
