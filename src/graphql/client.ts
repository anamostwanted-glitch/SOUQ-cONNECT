import { ApolloClient, InMemoryCache, createHttpLink, from } from "@apollo/client/core";
import { onError } from "@apollo/client/link/error";

const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
          graphQLErrors.forEach(({ message }) =>
                  console.warn(`[GraphQL error]: ${message}`)
                                    );
    }
    if (networkError) {
          console.warn(`[Network error]: ${networkError.message}`);
    }
});

const httpLink = createHttpLink({
    uri: "/graphql",
});

export const client = new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
          watchQuery: {
                  fetchPolicy: 'cache-first',
                  errorPolicy: 'all',
          },
          query: {
                  fetchPolicy: 'cache-first',
                  errorPolicy: 'all',
          },
    },
});
