import { createServer } from "node:http";

const origin = "http://127.0.0.1:5173";
const now = "2026-07-16T10:00:00.000Z";
const expiresAt = "2026-07-17T10:00:00.000Z";

const users = [
  {
    id: "qa-admin",
    username: "admin",
    name: "admin",
    email: "admin@local.nebulens",
    isAdmin: true,
    createdAt: "2026-05-01T08:00:00.000Z",
    quota: { total: 100, usedToday: 18, remainingToday: 82 },
  },
  {
    id: "qa-creator-1",
    username: "linchen",
    name: "linchen",
    email: "linchen@local.nebulens",
    isAdmin: false,
    createdAt: "2026-06-18T09:30:00.000Z",
    quota: { total: 20, usedToday: 7, remainingToday: 13 },
  },
  {
    id: "qa-creator-2",
    username: "moyun",
    name: "moyun",
    email: "moyun@local.nebulens",
    isAdmin: false,
    createdAt: "2026-07-03T14:20:00.000Z",
    quota: { total: 40, usedToday: 32, remainingToday: 8 },
  },
];

function send(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

createServer((request, response) => {
  if (request.method === "OPTIONS") {
    send(response, 204, null);
    return;
  }

  if (request.url === "/api/auth/get-session") {
    send(response, 200, {
      session: {
        id: "qa-session",
        userId: "qa-admin",
        token: "qa-token",
        expiresAt,
        createdAt: now,
        updatedAt: now,
        ipAddress: "127.0.0.1",
        userAgent: "Nebulens design QA",
      },
      user: {
        id: "qa-admin",
        name: "admin",
        email: "admin@local.nebulens",
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
        username: "admin",
        displayUsername: "admin",
      },
    });
    return;
  }

  if (request.url === "/api/auth/me") {
    send(response, 200, {
      user: {
        id: "qa-admin",
        email: "admin@local.nebulens",
        username: "admin",
        name: "admin",
        image: null,
        isAdmin: true,
      },
    });
    return;
  }

  if (request.url === "/api/admin/users" && request.method === "GET") {
    send(response, 200, { users });
    return;
  }

  send(response, 404, {
    error: {
      code: "NOT_FOUND",
      message: "QA endpoint not found",
      requestId: "qa-request",
    },
  });
}).listen(3000, "127.0.0.1");
