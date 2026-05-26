# photo_collection
Backend For a Cloud Photo Storage app

## Development

Install dependencies and run the service:

```sh
npm install
npm start
```

The server listens on `PORT` when set, otherwise `3030`.

MySQL connection settings can be configured with:

- `DB_HOST` (default `127.0.0.1`)
- `DB_USER` (default `root`)
- `DB_PASSWORD` (default empty)
- `DB_NAME` (default `photo_collection`)

Run the focused regression tests with:

```sh
npm test
```
