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
  error_retry_cta: 'Try again',
  error_app_body_fallback: 'Try again, or head back to your feed.',

  dashboard_feed_load_failed: 'Could not load the feed.',

  landing_live_loading: 'Loading the latest headlines…',
  landing_live_load_failed: 'Could not load live stories.',
  landing_live_stale_refresh_note:
    'Couldn’t refresh just now — still showing your last load.',
  landing_live_blurb_one:
    "1 story from the wire · open any card for Narvo's full gist and Truth layer.",
  landing_live_blurb_many:
    "{n} stories from the wire · open any card for Narvo's full gist and Truth layer.",
  landing_live_blurb_fallback:
    'Fresh stories from the wire · cross-checked when you open each story.',
  landing_live_empty: 'No stories right now. Start the API or check back shortly.',
  landing_live_headline_lead: "Here's what matters",
  landing_live_headline_emphasis: 'this morning.',
  landing_regions_badge: 'Africa & world',
  landing_breaking_strip_kicker: 'Breaking',
  landing_breaking_title_fallback: 'Tap for the full gist',

  /** Landing `app/page.tsx` — hero, slider, stats, voice sheet, pre-footer, footer */
  landing_hero_headline_line1: "Africa's news,",
  landing_hero_headline_emphasis: 'spoken clearly.',
  landing_cta_start_listening: 'Oya, Start Listening',
  landing_cta_try_first: 'Try it first',
  landing_cta_listen_sample: 'Listen to a sample',
  landing_theme_toggle_a11y: 'Toggle theme',
  landing_scroll_top_a11y: 'Scroll to top',
  landing_tts_error_line: 'The signal is fuzzy right now. Hold tight — try again shortly.',

  landing_voice_sheet_close_a11y: 'Close voice preview',
  landing_voice_modal_close_a11y: 'Close',
  landing_voice_kicker: 'Preview',
  landing_voice_modal_title: 'Listen in your language',
  landing_voice_modal_desc: 'Short clips — the same briefing voices you hear after you sign up.',
  landing_voice_try_heading: 'Play a sample',
  landing_voice_try_hint: 'Tap the button next to any language.',
  landing_voice_listen_sample_title: 'Play',
  landing_voice_listen_sample_a11y: 'Play sample in {language}',
  landing_voice_row_sample_sub: 'Briefing clip',
  landing_voice_preview_row_en_title: 'English',
  landing_voice_preview_row_pcm_title: 'Nigerian Pidgin',
  landing_voice_preview_row_yo_title: 'Yorùbá',
  landing_voice_preview_row_ha_title: 'Hausa',
  landing_voice_preview_row_ig_title: 'Igbo',

  landing_feature_slider_aria: 'Narvo product features',
  landing_feature_view_a11y: 'View {title} feature',
  landing_feature_progress_caption: 'Catching up on the latest',

  landing_feature_briefing_title: 'Morning Briefing',
  landing_feature_briefing_desc: 'Wake up to the stories that matter, already sorted for you.',
  landing_feature_audio_title: 'Audio-First',
  landing_feature_audio_desc: 'Clear voices, built for your commute, your kitchen, and your morning.',
  landing_feature_language_title: 'Your Language',
  landing_feature_language_desc:
    'Yoruba, Hausa, Igbo, Pidgin, English. Hear the story the way it fits your world.',
  landing_feature_trust_title: 'Cross-Checked',
  landing_feature_trust_desc: 'See the sources, confidence, and context behind every story.',
  landing_feature_offline_title: 'Offline Ready',
  landing_feature_offline_desc: 'Save stories when you have connectivity. Available offline anywhere.',

  landing_stats_headline_lead: 'Built on',
  landing_stats_headline_emphasis: 'trust & clarity.',
  landing_stats_sources_value: '200+',
  landing_stats_sources_label: 'Sources monitored across the continent',
  landing_stats_briefing_value: '3–12 min',
  landing_stats_briefing_label: 'Typical briefing length (by story count)',
  landing_stats_clarity_value: '98%',
  landing_stats_clarity_label: 'Listeners rate clarity highly',
  landing_stats_stories_value: '5–8',
  landing_stats_stories_label: 'Stories per briefing, carefully curated',

  landing_prefooter_line1: "The day's biggest stories,",
  landing_prefooter_emphasis: 'turned into a briefing.',

  landing_footer_privacy: 'Privacy Policy',
  landing_footer_terms: 'Terms of Service',
  landing_footer_cookies: 'Cookie Settings',
  landing_footer_contact: 'Contact Us',
  landing_footer_copyright: '© 2026 Narvo Intelligence. All rights reserved.',

  truth_tag_status_verified: 'Verified',
  truth_tag_status_checking: 'Checking',
  truth_tag_status_disputed: 'Disputed',
  truth_tag_last_checked_label: 'Last checked:',
  truth_tag_close_a11y: 'Close verification details',

  settings_account: 'Account',
  settings_tab_account: 'Account',
  settings_tab_voice: 'Voice & language',
  settings_tab_notifications: 'Notifications',
  settings_tab_billing: 'Billing',
  settings_voice_from_cloud: 'From your Narvo account',
  settings_voice_local: 'On this device',
  settings_edit_onboarding: 'Change in onboarding',
  settings_sign_out: 'Sign out',
  settings_tablist_a11y: 'Settings sections',
  settings_signed_in_as_prefix: 'Signed in as',
  settings_cloud_session_note:
    "Cloud sync uses your session. Sign out clears this device's Narvo session and API token.",
  settings_voice_cloud_line: 'Voice: {voice} · Region: {region}',
  settings_voice_local_line: 'Voice: {voice} · Language: {language}',
  settings_notifications_unsupported: 'Notifications are not supported in this browser.',
  settings_cloud_sync_title: 'Cloud sync',
  settings_cloud_sync_body_before: 'After you sign in with Narvo on',
  settings_cloud_sync_auth_link: '/auth',
  settings_cloud_sync_body_after:
    ', preferences and offline saves can sync with the API. The access token is stored on this device for authenticated requests.',
  settings_billing_placeholder:
    'Upgrade to Narvo Pro for expanded listening and priority features when billing is enabled on this server.',
  settings_billing_tier_free: 'You are on the Free plan.',
  settings_billing_tier_pro: 'You are on Narvo Pro.',
  settings_billing_upgrade: 'Upgrade to Pro',
  settings_billing_manage: 'Manage billing',
  settings_billing_loading: 'Loading plan…',
  settings_billing_error: 'Could not load subscription.',
  settings_billing_not_configured: 'Checkout is not configured (Stripe keys missing on the API).',
  settings_billing_success: 'Welcome to Pro — your plan will update in a moment.',
  subscription_page_title: 'Plans',
  subscription_page_kicker: 'Support Narvo and unlock more',
  subscription_plan_free_title: 'Free',
  subscription_plan_free_desc: 'Daily feed, briefing, and core listening.',
  subscription_plan_pro_title: 'Pro',
  subscription_plan_pro_desc: 'Expanded features and priority updates as we ship them.',
  subscription_cta_checkout: 'Subscribe',
  subscription_sign_in_hint: 'Sign in to subscribe.',
  listen_broadcast_title: 'Broadcast',
  listen_broadcast_desc:
    'Play through today’s top stories in order — like a short news radio block. Starts from the top of the queue when you enable it.',
  listen_broadcast_enable: 'Start broadcast',
  listen_broadcast_disable: 'Stop broadcast',
  news_ai_synthesis_note:
    'This story’s listenable script may include AI-assisted synthesis from multiple sources; see Truth for verification details.',
  settings_voice_api_list_kicker: 'Voices from Narvo (API)',
  settings_voice_api_error: 'Could not load voice list.',

  library_saved_cloud: 'Synced',

  /**
   * Auth / recovery — Clear/Assured (Copy System §16).
   * Not yet in Narvo_App_Copy tables; keep aligned when keys are added.
   * `auth_marketing_briefing_scope` matches backend briefing shape (`lib/briefing-defaults.ts`).
   */
  auth_marketing_briefing_scope:
    'Daily briefings use 5–8 curated stories (about 3–12 minutes), tuned to your feed and voice. Spoken audio uses the opening portion of the script so longer editions stay smooth.',

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
    'Sign-in uses sucured auth. Your token stays on this device so Narvo can sync your data.',
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
    'Enter the email you use for Narvo. If it matches an account, we will send a secure link to set a new password.',
  recovery_send_link: 'Send reset link',
  recovery_return_sign_in: 'Return to sign in',
  recovery_success_if_account: 'If an account exists for',
  recovery_success_then_supabase:
    'you will receive an email shortly with a link to choose a new password. Check your spam folder if you do not see it.',
  recovery_success_demo:
    'Nothing was sent — Narvo email is not configured in this environment. Add NEXT_PUBLIC_SUPABASE_URL and keys, then try again.',
  recovery_generic_privacy_note:
    'For security, we never confirm whether a specific address is registered.',
  auth_update_password_title: 'Choose a new password',
  auth_update_password_intro: 'You are signed in from the reset link. Enter a new password for your account.',
  auth_label_new_password: 'New password',
  auth_label_confirm_password: 'Confirm password',
  auth_update_password_cta: 'Update password',
  auth_update_password_mismatch: 'Passwords do not match.',
  auth_update_password_success: 'Password updated.',
  auth_update_password_continue: 'Continue',
  auth_recovery_session_missing: 'This link is invalid or has expired. Request a new reset from sign in.',

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
    'Each language uses one Narvo narrator for your briefing. Tap play to hear that voice.',
  onboard_lang_section_note: 'Language & narrator',
  onboard_narrator_line: 'Narrator · {name} ({accent})',
  onboard_lang_tag_en: 'Standard Nigerian',
  onboard_lang_tag_pidgin: 'How e dey?',
  onboard_lang_tag_yoruba: 'Ẹ káàárọ̀, Oga',
  onboard_lang_tag_hausa: 'Sannu',
  onboard_lang_tag_igbo: 'Nnọọ',
  onboard_notify_title: 'Never miss your morning briefing.',
  onboard_notify_desc:
    'Each morning briefing is 5–8 curated stories (about 3–12 minutes). You can change this later in Settings.',
  onboard_notify_cta: 'Turn on notifications',
  onboard_notify_later: 'Maybe later',
  onboard_complete: "Oya, Let's Go",
  onboard_skip: 'Skip for now',
  onboard_back: 'Back',
  onboard_voice_preview_playing_a11y: 'Playing sample for {name}',
  onboard_push_preview_now: 'now',

  /** §3 Global CTAs */
  cta_continue: 'Continue',

  /** §9 Voice & Language */
  voice_pick_prompt: 'Pick the voice for your briefing',
  voice_preview: 'Listen to a sample',

  /** §5 Home Dashboard — Narvo_App_Copy.md */
  dashboard_notify_banner_title: 'Get your briefing on time',
  dashboard_notify_banner_body:
    'Turn on notifications and we can ping you when your morning roundup is ready — even if the app is closed.',
  dashboard_notify_banner_cta: 'Enable notifications',
  dashboard_notify_banner_dismiss: 'Not now',
  /** App shell header — matches other surfaces (kicker + serif title). */
  dashboard_page_title: 'Home',
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
  home_briefing_syncing: 'Syncing your briefing…',
  home_briefing_unavailable: 'We couldn’t load your briefing. Open the briefing page to try again.',
  home_briefing_awaiting:
    'When your first briefing is ready, you’ll hear it from here. Expect 5–8 stories (about 3–12 minutes).',
  /** Compact feed cue — maps to API trust_score (0–100). */
  truth_confidence_chip: '{pct}% confidence',

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
  briefing_page_checking: 'Checking your briefing…',
  briefing_page_unavailable_title: 'Briefing unavailable',
  briefing_page_hang_tight: 'Hang tight.',
  briefing_page_viewing_for: 'Viewing briefing for',
  briefing_page_show_latest: 'Show latest',
  briefing_page_regenerate: 'Regenerate briefing',
  briefing_page_load_date_failed: 'Could not load that date.',
  briefing_page_regenerate_ok: 'Briefing regenerated. You can play the latest above.',
  briefing_page_generate_failed: 'Generation failed.',
  briefing_page_no_audio_hint:
    'No audio URL yet — tap Regenerate briefing or wait for the scheduled run.',
  briefing_page_history_title: 'Recent briefings',
  briefing_page_history_loading: 'Loading history…',
  briefing_page_history_empty: 'No past briefings in the database yet.',
  briefing_page_history_fallback_title: 'Morning briefing',
  briefing_page_regenerate_footer_before: 'Regenerate calls',
  briefing_api_generate_path: 'GET /api/briefing/generate',
  briefing_page_regenerate_footer_after: 'and may take a minute.',
  briefing_transcript_disabled_hint: 'Transcript appears when a briefing script is available.',
  briefing_transcript_seek_hint: 'Tap a story to jump to that part in the player.',
  push_briefing_title: 'Your morning briefing is ready',
  push_briefing_body: '{n} stories · {duration} min · Tap to listen',

  /** §13 Settings */
  settings_title: 'Settings',
  settings_coming: 'Preferences and account controls will live here.',

  /** App shell — rail, header */
  rail_toggle_label: 'Collapse sidebar',
  rail_expand_a11y: 'Expand sidebar',
  rail_collapse_a11y: 'Collapse sidebar',
  rail_theme_label: 'Theme',
  theme_switch_dark_a11y: 'Switch to dark theme',
  theme_switch_light_a11y: 'Switch to light theme',
  nav_logout_a11y: 'Sign out',
  nav_notifications_a11y: 'Notifications',
  header_search_wide_placeholder: 'Title, topic, or source',

  /** Toasts & inline feedback */
  toast_saved_offline: 'Saved for offline listening.',
  toast_share_opened: 'Share sheet opened.',
  toast_share_copied: 'Link copied to clipboard.',
  toast_share_failed: 'Could not share this story.',
  toast_load_more_failed: 'Could not load more stories.',
  feed_card_trending_kicker: 'Trending',
  feed_card_latest_kicker: 'Latest',
  feed_card_read_time: '{n} min read',
  feed_loading_more: 'Loading more…',
  feed_end_of_list: 'You’re caught up.',
  dashboard_clock_kicker: 'Local time',
  dashboard_clock_a11y: 'Current local time and date',
  dashboard_sort_label: 'Sort',
  dashboard_sort_newest: 'Newest',
  dashboard_sort_oldest: 'Oldest',
  dashboard_sort_source: 'Source A–Z',
  dashboard_category_label: 'Category',
  dashboard_category_all: 'All topics',
  dashboard_feed_toolbar_a11y: 'Filter, sort, and choose a category for your feed',
  toast_story_no_audio: 'No narration yet — open the article to read or try again shortly.',

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
  listen_global_player_kicker: 'Global player',
  listen_play_a11y: 'Play',
  listen_pause_a11y: 'Pause',
  insights_page_title: 'Insights',
  insights_page_kicker: 'Your listening history',
  insights_empty: 'No plays logged yet. Start something from Home or Briefing.',
  insights_sign_in: 'Sign in to see listening history synced to your account.',
  insights_load_failed: 'Could not load history.',
  insights_clear_confirm: 'Clear all listening history on this account?',
  insights_clear: 'Clear history',
  insights_analytics_note:
    'Totals use your synced plays. When duration is missing, we estimate from a typical story length.',
  discover_page_title: 'Discover',
  discover_trending: "What's Trending",
  browse_load_failed: 'Could not load stories.',
  discover_no_matches_title: 'No matches',
  discover_no_matches_desc: 'Try another keyword, category, or source.',
  search_no_matches_title: 'No matches',
  search_no_matches_desc: 'Try a different keyword, source, or category.',
  search_no_stories_title: 'No stories loaded',

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
  library_empty_saved_title: 'No offline stories yet',
  library_no_matches_title: 'No matches',
  library_no_matches_desc: 'Try another search, or save stories from your feed.',
  library_remove_saved_a11y: 'Remove from downloads',
  library_saved_prefix: 'Saved',

  download_indicator_saving: 'Saving',
  download_indicator_title: 'Saving story for offline listening',

  offline_error_quota: 'Storage is full. Free some space on this device, then try again.',
  offline_error_generic: 'We could not save this story offline. Check your connection and try again.',
  offline_downloading: 'Saving offline…',
  offline_retry: 'Try again',
  offline_saved: 'Saved for offline',

  news_related_heading: 'Related articles',
  news_download_save: 'Save offline',
  news_back_a11y: 'Go back',
  news_share_a11y: 'Share',
  news_share_unsupported: 'Sharing isn’t supported in this browser.',
  news_source_label: 'Original source',
  news_play_gist: 'Hear the gist',
  news_pause_gist: 'Pause gist',
  news_truth_kicker: 'Verification',
  news_truth_headline: 'What we could verify',
  news_truth_intro:
    'Narvo compared reporting from {n} sources. Here’s how we’re thinking about confidence for this story.',
  news_cross_checked: 'Cross-checked',
  news_sources_count_label: '{n} sources',
  news_confidence_meter_label: 'Confidence',
  news_confidence_footnote: 'Confidence reflects source diversity and factual alignment.',
  news_takeaways_heading: 'Key takeaways',
  news_body_heading: 'The story',
  news_meta_heading: 'Story details',
  news_meta_author: 'Author',
  news_meta_published: 'Published',
  news_meta_tags: 'Tags',
  news_loading_title: 'Loading…',
  news_error_title: 'Something went wrong',
  news_error_body: 'Try again in a moment, or return home.',
  news_load_failed: 'Could not load this story.',
  news_sources_empty: 'No separate source list for this story yet.',
  news_sources_loading: 'Loading source list…',
  news_sources_checked_label: 'Sources checked',
  news_audio_language_label: 'Audio language',
  news_detail_image_alt: 'Story image',
  news_not_found_title: 'This story isn’t here',
  news_not_found_body:
    'It may have left the feed or the link is wrong. Head home or open your dashboard for the latest.',

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
  // ── Toast system ──────────────────────────────────────────────────────────
  toast_saved: 'Keep this for later.',
  toast_queued: 'Added to queue.',
  toast_downloaded: 'Ready for offline listening.',
  toast_removed: 'Removed.',
  toast_error: 'Something went wrong. Try again.',
  toast_settings_saved: 'Settings saved.',
  toast_close_a11y: 'Dismiss',

  // ── TruthTag — "mixed" state (was "unverified") ───────────────────────────
  truth_tag_status_mixed: 'Mixed',
  truth_tag_ai_and_translation_note:
    'Narvo may synthesise or translate audio using AI. Editorials are grounded in the sources listed; always check the original outlets for full context.',

  // ── QueueItem ─────────────────────────────────────────────────────────────
  queue_item_remove_a11y: 'Remove from queue',
  queue_item_drag_a11y: 'Drag to reorder',
  queue_item_now_playing: 'Now playing',
  queue_empty_title: 'Queue is empty',
  queue_empty_desc: 'Stories you queue will appear here.',

  // ── AudioPlayer expanded sheet ────────────────────────────────────────────
  player_sheet_title: 'Now Playing',
  player_speed_label: 'Speed',
  player_queue_label: 'Up Next',
  player_shuffle_a11y: 'Shuffle',
  player_sleep_a11y: 'Sleep timer',
  player_expand_a11y: 'Expand player',
  player_open_article: 'Open article',
  player_open_article_a11y: 'Open full story',
  player_collapse_a11y: 'Collapse player',

  // ── BreakingBanner ────────────────────────────────────────────────────────
  breaking_banner_kicker: 'Breaking',
  breaking_banner_live: 'Live',
  breaking_banner_read_more: 'Read full story',

  // ── Dashboard sidebar ─────────────────────────────────────────────────────
  dashboard_sources_live_title: 'Sources live',
  dashboard_trending_title: 'Trending',
  dashboard_recommended_title: 'Up next',
  dashboard_source_online: 'online',
  dashboard_source_lag: 'lag',
  dashboard_feed_sources_count: '{n} recent in feed',
  dashboard_sources_empty: 'No source breakdown yet. Refresh when the feed has loaded.',
  dashboard_picked_sign_in: 'Sign in to see stories picked for your interests and listening history.',
  dashboard_picked_sign_in_cta: 'Sign in',
  dashboard_picked_empty: 'No personalized picks yet. Listen to a few stories or set topics in onboarding — we will tune this feed.',
  dashboard_up_next_empty: 'No stories to suggest yet.',

  // ── MobileNavDock live audio ──────────────────────────────────────────────
  nav_listen_live_a11y: 'Audio playing',

  // ── ToggleRow ─────────────────────────────────────────────────────────────
  toggle_on: 'On',
  toggle_off: 'Off',

  // ── Settings — new rows ───────────────────────────────────────────────────
  settings_theme_title: 'Theme',
  settings_theme_desc: 'Light, dark, or follow your system.',
  settings_theme_light: 'Light',
  settings_theme_dark: 'Dark',
  settings_theme_system: 'System',
  settings_sound_title: 'Sound themes',
  settings_sound_desc: 'Cinematic intro and transition cues for your briefing.',
  settings_accessibility_title: 'Accessibility',
  settings_accessibility_high_contrast_title: 'High contrast',
  settings_accessibility_high_contrast_desc: 'Keep proof and playback highly legible.',
  settings_accessibility_reduced_motion_title: 'Reduce motion',
  settings_accessibility_reduced_motion_desc: 'Minimise decorative transitions throughout the app.',

  // ── Listen hub ────────────────────────────────────────────────────────────
  listen_continue_title: 'Continue listening',
  listen_history_title: 'Recently played',
  listen_briefing_shortcut_title: 'Morning Briefing',
  listen_resume_cta: 'Resume',
  listen_play_cta: 'Play',
  listen_empty_continue: "You haven't started anything yet.",
  listen_empty_continue_desc: 'Stories you begin will appear here.',

  // ── SourceTimeline roles ──────────────────────────────────────────────────
  source_role_primary: 'Primary source',
  source_role_supporting: 'Supporting',
  source_role_context: 'Context',
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
