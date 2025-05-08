# twitch-project

## Files to manually create

Ensure you create a `.env` file in `be` project:

```
TWITCH_TOKEN=XXX
TWITCH_CLIENT_ID=XXX
```

## Development workflow

For backend development:

```
docker compose build && docker compose watch
```

For frontend development:

```
cd fe/ && npm run dev
```

Docs will be at http://localhost:5173/api/docs or http://localhost:8080/api/docs

The server at 5173 is Vite's dev server which proxies the Nginx server for ease of development

## Deployment

TODO
