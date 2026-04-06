/**
 * Canonical strings from docs/current/design/Narvo_App_Copy.md (v2.0+).
 * Onboarding order: docs/current/research/03_UX_Design_Patterns.md §6 (4 steps).
 * Tone: Narvo_Copy_System.md §16 (Warm/Narrative vs Clear/Assured).
 */

export const COPY = {
  brand_name: 'Narvo',
  brand_subtitle: 'Less scrolling. More understanding.',
  brand_tagline: "Africa's news, spoken clearly.",
  brand_tagline_alt: "The day's biggest stories, turned into a briefing.",
  landing_subtitle:
    'News that speaks your language. Summarised, cross-checked, and read aloud so you can stay informed without looking at a screen.',

  status_loading: 'Getting your stories ready...',
  status_playing_sample: 'Playing…',
  queue_processing: 'Getting this ready for you...',

  error_signal_fuzzy: 'The signal is fuzzy right now.',
  error_hold_tight: 'Hold tight. Try again shortly.',
  error_reconnecting: "We're reconnecting the dots.",
  error_generic: 'Something went wrong. Try again.',

  settings_account: 'Account',
  settings_tab_account: 'Account',
  settings_tab_voice: 'Voice & language',
  settings_tab_notifications: 'Notifications',
  settings_tab_billing: 'Billing',
  settings_voice_from_cloud: 'From your Narvo account',
  settings_voice_local: 'On this device',
  settings_edit_onboarding: 'Change in onboarding',
  settings_sign_out: 'Sign out',
  settings_billing_placeholder:
    'Billing and subscriptions will appear here when the product enables them.',

  library_saved_cloud: 'Synced',

  /**
   * Auth / recovery — Clear/Assured (Copy System §16).
   * Not yet in Narvo_App_Copy tables; keep aligned when keys are added.
   */
  auth_back_home: 'Back to home',
  auth_back_sign_in: 'Back to sign in',
  auth_or_email: 'Or email',
  auth_sign_in: 'Sign in',
  auth_create_account: 'Create account',
  auth_welcome_back: 'Welcome back',
  auth_join_headline: 'Join Narvo',
  auth_subtitle_sign_in: 'Hear what you missed today.',
  auth_forgot_password: 'Forgot password?',
  auth_toggle_new: 'New here? Create an account',
  auth_toggle_existing: 'Already have an account? Sign in',
  auth_oauth_unavailable:
    'Google and GitHub sign-in are not available in this preview. Use email to continue.',
  auth_demo_note:
    'Preview build: nothing is sent to a server. Your session stays on this device.',
  auth_session_note_supabase:
    'Sign-in uses Supabase. Your access token stays on this device so Narvo can sync preferences and saved stories with the API.',
  auth_check_email:
    'Check your email to confirm your account, then sign in. If confirmation is disabled, try signing in now.',
  auth_label_full_name: 'Full name',
  auth_label_email: 'Email',
  auth_label_password: 'Password',
  auth_placeholder_name: 'Your name',
  auth_placeholder_email: 'you@example.com',
  auth_placeholder_password_hint: 'At least 8 characters',
  auth_validation_email: 'Enter a valid email address.',
  auth_validation_password: 'Password must be at least 8 characters.',
  auth_validation_name: 'Please enter your name (at least 2 characters).',

  oauth_continue_google: 'Continue with Google',
  oauth_continue_github: 'Continue with GitHub',

  recovery_card_title: 'Reset your password',
  recovery_card_intro:
    'Enter the email for your Narvo account. When reset is live, we will email you a link. This flow is a preview today.',
  recovery_send_link: 'Send reset link',
  recovery_return_sign_in: 'Return to sign in',
  recovery_success_if_account: 'If an account exists for',
  recovery_success_then: 'you will get reset instructions when recovery is live.',
  recovery_success_demo: 'Nothing was sent in this preview build.',

  /** §4 Onboarding — 4-step flow (UX Patterns §6 + Narvo_App_Copy §4) */
  onboard_welcome_title: 'Your news. Your language. Your voice.',
  onboard_welcome_desc:
    'Trusted reporting, distilled into audio you can hear on the move.',
  onboard_welcome_cta: "Let's go",
  onboard_topics_title: 'What stories matter to you?',
  onboard_topics_desc: 'Pick at least 3 topics to personalise your feed.',
  onboard_topics_count: '{n} of 3 selected',
  onboard_lang_voice_title: 'What languages do you speak at home?',
  onboard_lang_voice_desc:
    "We'll deliver your stories in the right voice. Choose a language, pick a narrator, and tap the sample to listen.",
  onboard_lang_section_note: 'Language & region',
  onboard_voice_section_title: 'Who should tell the story today?',
  onboard_voice_section_desc: 'Pick the voice for your briefing.',
  onboard_lang_tag_en: 'Standard Nigerian',
  onboard_lang_tag_pidgin: 'How e dey?',
  onboard_lang_tag_yoruba: 'Ẹ káàárọ̀, Oga',
  onboard_lang_tag_hausa: 'Sannu',
  onboard_lang_tag_igbo: 'Nnọọ',
  onboard_notify_title: 'Never miss your morning briefing.',
  onboard_notify_desc:
    'About five minutes of news, sorted for you each morning. You can change the time in Settings later.',
  onboard_notify_demo:
    "This preview may ask your browser for permission. Nothing is sent to Narvo's servers yet.",
  onboard_notify_cta: 'Turn on notifications',
  onboard_notify_later: 'Maybe later',
  onboard_complete: "Oya, Let's Go",
  onboard_skip: 'Skip for now',
  onboard_back: 'Back',

  /** §3 Global CTAs */
  cta_continue: 'Continue',

  /** §9 Voice & Language */
  voice_pick_prompt: 'Pick the voice for your briefing',
  voice_preview: 'Listen to a sample',

  /** §5 Home Dashboard — Narvo_App_Copy.md */
  home_greeting_morning: 'Good morning, {name}',
  home_greeting_afternoon: 'Good afternoon, {name}',
  home_greeting_evening: 'Good evening, {name}',
  home_briefing_ready: 'Your briefing is ready',
  home_briefing_meta: '{n} stories · {duration} min',
  home_trending: 'Trending Now',
  home_latest: 'Latest Stories',
  home_breaking: 'Breaking',
  home_recommended: 'Picked for You',
  home_empty: 'Nothing here yet. Check back soon.',
  home_nav_see_all: 'See all',

  /** §3 Global */
  cta_play: 'Oya, Play',

  /** §7 Morning Briefing */
  briefing_title: 'Morning Briefing',
  briefing_ready: 'Your briefing is ready',
  briefing_listen_now: 'Listen now',
  briefing_preview_sample: 'Preview sample',
  briefing_pause: 'Pause',
  briefing_handoff_line: 'That’s a wrap on this briefing.',
  briefing_handoff_discover: 'Browse stories',
  briefing_handoff_listen: 'Listen hub',
  briefing_handoff_dismiss: 'Dismiss',
  listen_featured_kicker: 'From your feed',
  listen_featured_title: 'Start here',
  briefing_transcript: 'Transcript',
  briefing_open_full: 'Open full briefing',
  push_briefing_title: 'Your morning briefing is ready',
  push_briefing_body: '{n} stories · {duration} min · Tap to listen',

  /** §13 Settings */
  settings_title: 'Settings',
  settings_coming: 'Preferences and account controls will live here.',

  /** §8 Search & Discover */
  search_placeholder: 'Find a story',
  search_empty: 'Start with a topic, place, or headline.',
  search_page_title: 'Search',
  search_page_kicker: 'Find a story',
  search_link_discover: 'Browse trending in Discover',
  listen_page_title: 'Listen',
  listen_page_kicker: 'Your audio hub',
  listen_now_playing: 'Now playing',
  listen_nothing_playing: 'Nothing playing — open your feed or briefing to start.',
  listen_open_briefing: 'Morning briefing',
  listen_open_library: 'Saved & offline',
  listen_open_feed: 'Home feed',
  listen_briefing_card: "Today's briefing",
  listen_briefing_play: 'Play briefing',
  insights_page_title: 'Insights',
  insights_page_kicker: 'Your listening history',
  insights_empty: 'No plays logged yet. Start something from Home or Briefing.',
  insights_sign_in: 'Sign in to see listening history synced to your account.',
  insights_clear_confirm: 'Clear all listening history on this account?',
  insights_clear: 'Clear history',
  discover_page_title: 'Discover',
  discover_trending: "What's Trending",

  /** §12 Library */
  library_page_title: 'Library',
  library_saved: 'Saved Stories',
  library_offline: 'Available Offline',
  library_empty_offline: 'No offline stories yet. Save stories from your feed to listen anywhere.',
  library_search_placeholder: 'Search by title or source',
  library_sort_label: 'Sort',
  library_sort_date_new: 'Newest saved',
  library_sort_date_old: 'Oldest saved',
  library_sort_title_az: 'Title A–Z',
  library_sort_title_za: 'Title Z–A',
  library_listen_read_time: '{time} listen · ~{read} read',
  library_swipe_hint: 'Swipe left to remove',
  library_clear_all: 'Clear all downloads',
  library_clear_all_confirm:
    'Remove every saved story from this device and from your Narvo cloud library (if signed in)? This cannot be undone.',

  download_indicator_saving: 'Saving',
  download_indicator_title: 'Saving story for offline listening',

  offline_error_quota: 'Storage is full. Free some space on this device, then try again.',
  offline_error_generic: 'We could not save this story offline. Check your connection and try again.',
  offline_downloading: 'Saving offline…',
  offline_retry: 'Try again',
  offline_saved: 'Saved for offline',

  news_related_heading: 'Related articles',
  news_download_save: 'Save offline',

  settings_notifications_title: 'Notifications',
  settings_notifications_desc:
    'Get reminded when your morning briefing is ready. Breaking news alerts will arrive here once push is connected to Narvo servers.',
  settings_notifications_enable: 'Enable briefing reminders',
  settings_notifications_test: 'Send test notification',
  settings_notifications_test_breaking: 'Test breaking-style alert',
  settings_notifications_disabled: 'Notifications are off in your browser settings.',
  settings_notifications_granted: 'Notifications are on for this device.',

  push_breaking_title: 'Breaking on Narvo',
  push_breaking_body: 'Open the app for the latest cross-checked story.',

  tutorial_skip: 'Skip',
  tutorial_next: 'Next',
  tutorial_done: 'Got it',
  tutorial_step_briefing_title: 'Daily briefings',
  tutorial_step_briefing_body:
    'Catch up in minutes with a spoken rundown of what matters—built for busy mornings.',
  tutorial_step_truth_title: 'Cross-checked stories',
  tutorial_step_truth_body:
    'Narvo surfaces how reporting lines up across sources so you can trust what you hear.',
  tutorial_step_language_title: 'Language & voice',
  tutorial_step_language_body:
    'Hear the news in the language and narrator you chose during onboarding—change anytime in Settings.',
  tutorial_step_notify_title: 'Stay in the loop',
  tutorial_step_notify_body:
    'Turn on notifications for briefing reminders; breaking alerts will follow when push goes live.',
} as const;

const ONBOARD_TOTAL_STEPS = 4;

/** `onboard_progress` — Step {n} of 4 */
export function onboardProgressLabel(step: number): string {
  return `Step ${step} of ${ONBOARD_TOTAL_STEPS}`;
}

export function onboardTopicsCountLabel(selected: number): string {
  return COPY.onboard_topics_count.replace('{n}', String(selected));
}

export function pushBriefingBodyPreview(stories: number, minutes: number): string {
  return COPY.push_briefing_body
    .replace('{n}', String(stories))
    .replace('{duration}', String(minutes));
}

export function homeGreeting(name?: string | null): string {
  const display = name?.trim() || 'there';
  const h = new Date().getHours();
  const template =
    h < 12
      ? COPY.home_greeting_morning
      : h < 17
        ? COPY.home_greeting_afternoon
        : COPY.home_greeting_evening;
  return template.replace('{name}', display);
}

export function homeBriefingMeta(stories: number, minutes: number): string {
  return COPY.home_briefing_meta
    .replace('{n}', String(stories))
    .replace('{duration}', String(minutes));
}

/** Parse "3 min" style labels for heuristic read time. */
export function estimatedReadMinutesFromListenLabel(timeLabel: string): number {
  const m = timeLabel.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 3;
  return Math.max(1, Math.round(n * 1.2));
}

/** Library / related cards: "3 min listen · ~4 read" */
export function libraryListenReadTimeLine(timeLabel: string): string {
  const read = estimatedReadMinutesFromListenLabel(timeLabel);
  return COPY.library_listen_read_time.replace('{time}', timeLabel).replace('{read}', String(read));
}

/** Approximate read time from listen label (e.g. "3 min" → ~4 min read). */
export function formatLibraryListenReadTime(timeLabel: string): string {
  const m = timeLabel.match(/(\d+)/);
  const listenMins = m ? parseInt(m[1], 10) : 3;
  const readMins = Math.max(1, Math.round(listenMins * 1.25));
  return COPY.library_listen_read_time
    .replace('{time}', timeLabel)
    .replace('{read}', `${readMins} min`);
}

/** Split `brand_tagline` into rail headline + italic line (matches landing rhythm). */
export function brandTaglineParts(): { title: string; emphasis: string } {
  const t = COPY.brand_tagline;
  const idx = t.indexOf(', ');
  if (idx === -1) return { title: t, emphasis: '' };
  return {
    title: t.slice(0, idx + 1),
    emphasis: t.slice(idx + 2),
  };
}
