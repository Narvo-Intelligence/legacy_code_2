/**
 * TTS-related constants. Use for voice preview and any place we need sample text per language.
 * See docs/Constants_And_Logic.md.
 *
 * Preview text is in the target language so the backend does not need to translate;
 * the user hears the voice in that language.
 */

/** Language code → short phrase for TTS preview (in that language). Backend speaks this as-is. */
export const TTS_PREVIEW_SAMPLES = {
  en: 'Welcome to Narvo. Your trusted source for African news.',
  pcm: 'Welcome to Narvo. Na here wey you go get African news wey you fit trust.',
  yo: 'Ẹ ku abọ si Narvo. Ibẹ ni o ri iroyin ilẹ Afirika ti o le gbẹkẹle.',
  ha: 'Barka da zuwa Narvo. Wurin da za ka sami labarai na Afirka da za ka iya amincewa.',
  ig: 'Nnọọ na Narvo. Ebe ị ga-enweta akụkọ Africa ị pụrụ ịtụkwasị obi.',
};

/** Default sample when language is missing or unknown (English). */
export const TTS_PREVIEW_DEFAULT = TTS_PREVIEW_SAMPLES.en;

/**
 * Get the TTS preview phrase for a language code. Use when playing voice preview so the
 * sample is spoken in the selected voice's language.
 * @param {string} [languageCode] - e.g. 'en', 'pcm', 'yo', 'ha', 'ig'
 * @returns {string}
 */
export function getTtsPreviewSample(languageCode) {
  if (!languageCode || typeof languageCode !== 'string') return TTS_PREVIEW_DEFAULT;
  const code = languageCode.toLowerCase().split('-')[0];
  return TTS_PREVIEW_SAMPLES[code] ?? TTS_PREVIEW_DEFAULT;
}
