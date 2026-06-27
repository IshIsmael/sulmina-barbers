'use strict';

/**
 * MongoDB Atlas connection.
 *
 * Single connection, held for the app's lifetime. connect() is called
 * once from server.js before Express starts listening. If MONGODB_URI
 * is missing or the connection fails, the process exits loudly —
 * there is no silent fallback.
 */

const { MongoClient, ServerApiVersion } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env and paste your Atlas connection string.'
    );
  }

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });
  await client.connect();

  db = client.db();
  if (db.databaseName === 'test') {
    throw new Error(
      'MONGODB_URI does not specify a database name. Add "/sulmina" (or your chosen name) before the "?" in the connection string.'
    );
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB has not been initialised. Call connect() first.');
  return db;
}

function getClient() {
  if (!client) throw new Error('MongoDB has not been initialised. Call connect() first.');
  return client;
}

/**
 * Create required indexes if they don't exist. Idempotent — safe to run
 * on every startup. Called from server.js after connect() resolves.
 */
async function ensureIndexes() {
  const database = getDb();

  // Primary overlap index: fast per-barber-per-day lookups.
  await database.collection('bookings').createIndex(
    { barberId: 1, startAt: 1 },
    { name: 'barber_start' }
  );

  // Secondary: customer-email index for any future "my bookings" lookup.
  // Kept even though Phase 3 doesn't query by it.
  await database.collection('bookings').createIndex(
    { customerEmail: 1 },
    { name: 'customer_email' }
  );
}

async function close() {
  if (client) await client.close();
  client = null;
  db = null;
}

module.exports = { connect, getDb, getClient, ensureIndexes, close };
