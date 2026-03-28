import { Helmet } from 'react-helmet-async';

/**
 * ListenPage — /listen
 * Audio hub: Morning Briefing + Continue Listening + Queue + Recently Played.
 * Replaces the /listen → /briefing redirect.
 * Full implementation: Phase 2 of the v4 overhaul.
 */
const ListenPage = () => {
  return (
    <>
      <Helmet>
        <title>Listen — Narvo</title>
        <meta name="description" content="Your audio hub. Morning Briefing, queue, and listening history." />
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
            Listen
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-mid)' }}>
            Coming soon — Morning Briefing, queue, and listening history.
          </p>
        </div>
      </div>
    </>
  );
};

export default ListenPage;
