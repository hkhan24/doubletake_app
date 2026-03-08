const WESTERN_SOURCES = ['cnn', 'bbc-news', 'reuters', 'the-washington-post', 'the-wall-street-journal', 'associated-press', 'bloomberg'];
const NON_WESTERN_SOURCES = ['al-jazeera-english', 'the-hindu', 'rt', 'xinhua-net', 'the-times-of-india', 'scmp', 'tass'];

function categorizeSource(sourceId, sourceName) {
  const normalizedId = (sourceId || sourceName || '').toLowerCase();

  if (WESTERN_SOURCES.some(s => normalizedId.includes(s))) return 'western';
  if (NON_WESTERN_SOURCES.some(s => normalizedId.includes(s))) return 'non-western';

  // String-based fallback based on domain/name matches
  if (normalizedId.includes('aljazeera') || normalizedId.includes('al jazeera') || normalizedId.includes('scmp') || normalizedId.includes('tass') || normalizedId.includes('hindu') || normalizedId.includes('allafrica') || normalizedId.includes('cgtn') || normalizedId.includes('telesur')) {
    return 'non-western';
  }

  if (normalizedId.includes('bbc') || normalizedId.includes('reuters') || normalizedId.includes('cnn') || normalizedId.includes('apnews') || normalizedId.includes('bloomberg') || normalizedId.includes('washingtonpost')) {
    return 'western';
  }

  return 'unknown';
}

function isValidPair(article1, article2) {
  const cat1 = categorizeSource(article1.source.id, article1.source.name);
  const cat2 = categorizeSource(article2.source.id, article2.source.name);

  return (cat1 === 'western' && cat2 === 'non-western') || (cat1 === 'non-western' && cat2 === 'western');
}

module.exports = { categorizeSource, isValidPair, WESTERN_SOURCES, NON_WESTERN_SOURCES };
