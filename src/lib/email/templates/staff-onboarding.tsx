export function staffOnboardingEmailHtml({
  name,
  role,
  appUrl,
  handbookUrl = "/staff/handbook",
  trainingUrl = "/staff/training",
  recipesUrl = "/staff/recipes",
  checklistsUrl = "/staff/checklists",
}: {
  name: string;
  role: string;
  appUrl: string;
  handbookUrl?: string;
  trainingUrl?: string;
  recipesUrl?: string;
  checklistsUrl?: string;
}) {
  const url = (p: string) => (p.startsWith("http") ? p : `${appUrl}${p}`);
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Team Member";

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 620px; margin: 0 auto; color: #1A1A1A; background: #FAF7F2; padding: 32px;">
      <div style="text-align:center; margin-bottom: 24px;">
        <h1 style="color: #286849; font-size: 24px; margin: 0;">Welcome to the Kynda family! ☕</h1>
      </div>

      <p>Hi ${name || "there"},</p>
      <p>We're so excited to have you joining the Kynda Coffee team as <strong>${roleLabel}</strong>. This email is your onboarding starter kit — everything you need to get set up before your first shift.</p>

      <div style="margin: 24px 0; padding: 20px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E8E0D5;">
        <h2 style="color: #286849; font-size: 18px; margin: 0 0 12px;">Your onboarding checklist</h2>
        <ol style="margin: 0; padding-left: 20px; line-height: 1.9;">
          <li>Read the <a href="${url(handbookUrl)}" style="color:#286849; font-weight:600;">Employee Handbook</a> and acknowledge it</li>
          <li>Review the <a href="${url(trainingUrl)}" style="color:#286849; font-weight:600;">Training materials</a> (Barista &amp; Baker Academy)</li>
          <li>Check out the <a href="${url(recipesUrl)}" style="color:#286849; font-weight:600;">Recipes</a> for drinks &amp; food</li>
          <li>Get familiar with the <a href="${url(checklistsUrl)}" style="color:#286849; font-weight:600;">Shift Checklists</a> (opening / mid / closing)</li>
        </ol>
      </div>

      <p><strong>Your account:</strong> use the invitation link sent separately to set your password and log in. Once logged in, you'll find all of this under the <strong>Staff</strong> section of the site.</p>

      <div style="margin: 24px 0; padding: 16px; background: #E8F5EE; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px;">💡 <strong>Pro tip:</strong> Complete your handbook acknowledgment and forms before your first day so you can jump straight into training.</p>
      </div>

      <p>If you have any questions, reply to this email or talk to your manager on your first shift. We're thrilled to have you!</p>

      <p style="margin-top: 24px;">With warmth,<br>— The Kynda Coffee Team</p>

      <hr style="border:none; border-top:1px solid #E8E0D5; margin: 24px 0;">
      <p style="font-size:12px; color:#8a8378;">Kynda Coffee · Horseshoe Bay, Texas · kyndacoffee.com</p>
    </div>
  `;
}

export const STAFF_ONBOARDING_SUBJECT = (name?: string) =>
  `Welcome to Kynda Coffee, ${name || "new team member"}! ☕`;
