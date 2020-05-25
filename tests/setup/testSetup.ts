import ApolloClient from 'apollo-client';
import { Http2Server } from 'http2';
import { InMemoryCache } from 'apollo-cache-inmemory';
import NodeWebSocket from 'ws';
import { PrismaClient } from '@prisma/client';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocketLink } from 'apollo-link-ws';
import { createApolloServer } from '../../src/server';
import { createApp } from '../../src/app';
import { createServer as createHttpServer } from 'http';
import { exec } from 'child_process';
import express from 'express';

const prisma = new PrismaClient();
const port = 5000;
let server: Http2Server;
let networkInterface;
export let apolloClient;
export const testHost = `http://localhost:${port}/graphql`;
const testSubscriptionHost = `ws://localhost:${port}/graphql`;

beforeAll(async (done) => {
  const app: express.Application = createApp();

  server = createHttpServer(app);
  const apollo = createApolloServer();
  // @ts-ignore
  apollo.installSubscriptionHandlers(server);
  server.listen(port, () => {
    apollo.applyMiddleware({ app });
    process.stdout.write(
      `🚀 Server ready at http://localhost:${port}${apollo.graphqlPath}\n`,
    );
  });

  networkInterface = new SubscriptionClient(
    testSubscriptionHost,
    { reconnect: true },
    NodeWebSocket,
  );
  apolloClient = new ApolloClient({
    link: new WebSocketLink(networkInterface),
    cache: new InMemoryCache(),
  });

  exec('yarn migrate:test', (err): void => {
    if (err) throw new Error(err.message);
    done();
  });
});

afterAll(async () => {
  await prisma.executeRaw('DROP schema test CASCADE');
  networkInterface.close();
  server.close();
});
