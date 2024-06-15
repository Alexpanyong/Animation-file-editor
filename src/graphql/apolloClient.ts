import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
    uri: 'https://graphql.lottiefiles.com', // LottieFiles GraphQL endpoint
    cache: new InMemoryCache(),
});

export default client;