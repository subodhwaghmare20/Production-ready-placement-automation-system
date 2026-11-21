declare module 'mongodb-memory-server' {
  export class MongoMemoryServer {
    static create(): Promise<{
      getUri(): string;
      stop(): Promise<boolean>;
    }>;
  }
}
