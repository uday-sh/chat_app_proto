# Chat Backend

Spring Boot websocket backend for the chat frontend in this repo.

## Features

- STOMP websocket chat over `/ws`
- Room-based live messaging on `/topic/rooms/{roomId}`
- REST history on `/api/messages`
- Room summaries on `/api/rooms`
- Media upload endpoint on `/api/uploads`
- Static file hosting from `/uploads/**`

## Run

From the repo root:

```bat
start-backend.cmd
```

Or directly:

```bat
cd chat-backend
mvnw.cmd spring-boot:run
```

If Maven is not installed globally, the repo also includes a local Maven copy under `.tools/`.

## Frontend

Run the frontend from the repo root:

```bat
start-frontend.cmd
```

The Vite app talks to this backend at `http://localhost:8080`.
