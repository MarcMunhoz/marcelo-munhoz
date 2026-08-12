import { createContentfulAdminHandler, sessionFromNetlifyContext } from "./contentfulAdminCore.js";

const queryFromEvent = (event) => event.queryStringParameters || {};

const adminHandler = createContentfulAdminHandler({
  getSession({ context }) {
    return sessionFromNetlifyContext(context.event, context.netlifyContext);
  },
});

export const handler = async (event, netlifyContext) => {
  const response = await adminHandler({
    method: event.httpMethod,
    path: event.path,
    query: queryFromEvent(event),
    headers: event.headers || {},
    body: event.body,
    context: {
      event,
      netlifyContext,
    },
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
};
