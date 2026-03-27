import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core/index.js";

const httpLink = createHttpLink({
  uri: "/graphql",
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
