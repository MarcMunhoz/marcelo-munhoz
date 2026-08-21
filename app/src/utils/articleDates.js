export const normalizeArticleLocale = (locale = "", fallbackLocale = "pt-BR") => {
  const normalized = String(locale || "").trim();

  return ["pt-BR", "en-US"].includes(normalized) ? normalized : fallbackLocale;
};

export const isArticleLanguageTag = (tag = "") => ["article-lang-en-us", "article-lang-pt-br"].includes(String(tag || "").trim());

const normalizedLocale = (locale = "") => String(locale || "").trim() || "pt-BR";

export const articleLocaleFromArticle = (article = {}, fallbackLocale = "pt-BR") => {
  const explicitLocale = article.locale || article.language || article.lang;

  if (explicitLocale) {
    return explicitLocale;
  }

  const text = [article.slug, article.title, article.description, article.body].map((value) => String(value || "")).join(" ").toLowerCase();
  const englishSignals = /\b(the|and|what|when|during|career|people|software|with|about|you|your|my|in|for|to|of|learned|last|years)\b/g;
  const portugueseSignals = /\b(e|de|do|da|dos|das|em|para|por|com|voce|você|que|uma|um|os|as|no|na)\b/g;
  const englishCount = (text.match(englishSignals) || []).length;
  const portugueseCount = (text.match(portugueseSignals) || []).length;

  if (englishCount >= 2 && englishCount > portugueseCount) {
    return "en-US";
  }

  return normalizeArticleLocale(fallbackLocale);
};

export const articleBylineLabels = (locale = "pt-BR", article = {}) => {
  const language = normalizedLocale(articleLocaleFromArticle(article, locale)).toLowerCase();

  if (language.startsWith("en")) {
    return { by: "By", on: "on", updated: "Updated on" };
  }

  return { by: "Por", on: "em", updated: "Atualizado em" };
};

export const articleNavigationLabels = (locale = "pt-BR") => {
  if (normalizedLocale(locale).toLowerCase().startsWith("en")) {
    return { all: "All articles", previous: "Previous article", next: "Next article" };
  }

  return { all: "Todos os artigos", previous: "Artigo anterior", next: "Próximo artigo" };
};

const dateOnlyFormatter = (locale) =>
  new Intl.DateTimeFormat(normalizedLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

const dateKey = (date) => date.toISOString().slice(0, 10);

const parsedDate = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const date = new Date(text.length === 10 ? `${text}T12:00:00.000Z` : text);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const publicArticleDates = ({ createAt, updatedAt, fallbackCreatedAt, locale = "pt-BR" } = {}) => {
  const createdDate = parsedDate(createAt || fallbackCreatedAt);
  const updatedDate = parsedDate(updatedAt);
  const formatter = dateOnlyFormatter(locale);

  if (!createdDate) {
    return { created: "", updated: "" };
  }

  return {
    created: formatter.format(createdDate),
    updated: updatedDate && dateKey(updatedDate) !== dateKey(createdDate) ? formatter.format(updatedDate) : "",
  };
};
