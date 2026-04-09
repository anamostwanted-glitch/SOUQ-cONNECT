import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core";

const httpLink = createHttpLink({
  uri: "/graphql",
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
