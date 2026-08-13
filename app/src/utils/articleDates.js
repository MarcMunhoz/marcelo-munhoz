const normalizedLocale = (locale = "") => String(locale || "").trim() || "pt-BR";

export const articleBylineLabels = (locale = "pt-BR") => {
  const language = normalizedLocale(locale).toLowerCase();

  if (language.startsWith("en")) {
    return { by: "By", on: "on", updated: "Updated on" };
  }

  return { by: "Por", on: "em", updated: "Atualizado em" };
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
