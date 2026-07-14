import { contentfulHandler } from "../../middleware/contentfulProxy.js";

const queryFromEvent = (event) => event.queryStringParameters || {};

export const handler = async (event) => {
  const response = await contentfulHandler({
    path: event.path,
    query: queryFromEvent(event),
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
};
