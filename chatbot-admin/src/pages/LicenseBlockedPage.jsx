import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Two message tiers, by role_level — neither role can fix the license (only
// super_admin can, via LicenseSetupPage), so each is pointed at whoever they
// should actually contact:
//   - admin: knows this is a licensing problem and who to escalate it to
//     (the vendor/support team), since admin manages the org day-to-day.
//   - everyone else (manager/viewer/other): a generic message pointing them
//     at their own org's admin, with no internal detail exposed.
const ADMIN_COPY = {
  not_configured: 'This system has not been licensed yet. Please contact the chatbot support team.',
  tampered: 'The installed license failed an integrity check. Please contact the chatbot support team.',
  expired: 'License has expired. Please contact the chatbot support team.',
  inactive: 'The installed license is not currently active. Please contact the chatbot support team.',
};
const GENERIC_MESSAGE = 'There is a license related issue. Please contact your admin.';

// Shown full-page to every signed-in user who isn't a super admin whenever
// the system license is invalid — nobody else can reach any portal feature
// until a super admin resolves it from the License Setup screen (blueprint
// §40 update).
export default function LicenseBlockedPage() {
  const { user, refreshMe, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const message = user?.roleLevel === 'admin'
    ? (ADMIN_COPY[user?.license?.status] || ADMIN_COPY.not_configured)
    : GENERIC_MESSAGE;

  async function recheck() {
    setChecking(true);
    try {
      await refreshMe();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <h1>Access unavailable</h1>
        <p className="sub">{message}</p>
        <div className="actions" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button type="button" className="btn" onClick={logout}>Sign out</button>
          <button type="button" className="btn primary" onClick={recheck} disabled={checking}>
            {checking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>
    </div>
  );
}
