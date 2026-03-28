import { Helmet } from 'react-helmet-async';

/**
 * ProfilePage — /profile
 * User identity hub: stats, quick-access to Settings, Subscription, Voice Studio, Insights.
 * Replaces the /profile → /settings redirect.
 * Full implementation: Phase 2 of the v4 overhaul.
 */
const ProfilePage = () => {
  return (
    <>
      <Helmet>
        <title>Profile — Narvo</title>
        <meta name="description" content="Your Narvo profile, listening stats, and account settings." />
      </Helmet>
      <div className="page-scroll pb-safe">
        <div className="page-container py-8">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '39px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}
          >
            Profile
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-mid)' }}>
            Coming soon — listening stats, account settings, subscription, and voice preferences.
          </p>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
