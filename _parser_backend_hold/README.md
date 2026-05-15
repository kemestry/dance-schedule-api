# CompCoach Parser Backend

This is a minimal backend stub for the CompCoach mobile app upload parser.

It accepts:

- `link` imports
- `screenshot` imports backed by an uploaded image URL
- `pdf` imports backed by an uploaded PDF URL

It calls the OpenAI Responses API and returns a `ParsedCompetitionPayload`-shaped JSON object.

## Why this shape

The OpenAI Responses API accepts image inputs and file inputs. Official docs show:

- `input_image` with an `image_url` for image understanding
- `input_file` with a `file_url` for PDF/file understanding
- Structured Outputs via `json_schema` so the response conforms to an application schema

Sources:

- [Responses API overview](https://platform.openai.com/docs/api-reference/responses/retrieve)
- [File inputs guide](https://developers.openai.com/api/docs/guides/file-inputs)
- [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Images and vision guide](https://developers.openai.com/api/docs/guides/images-vision)

## Setup

1. Install backend dependencies:

```bash
cd parser-backend
npm install
```

2. Create a `.env` file:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5
PORT=8787
CORS_ORIGIN=*
```

3. Start the server:

```bash
npm run dev
```

4. Point the Expo app at it:

```bash
EXPO_PUBLIC_PARSER_API_URL=http://localhost:8787/parse-competition
```

If you are testing on a simulator, `localhost` usually works. On a physical device, use your machine's LAN IP.

## Endpoint

`POST /parse-competition`

Example request for a PDF:

```json
{
  "sourceType": "pdf",
  "asset": {
    "uri": "file:///ignored-by-backend.pdf",
    "name": "schedule.pdf",
    "mimeType": "application/pdf",
    "size": 12345,
    "storagePath": "schedule-assets/abc.pdf",
    "downloadUrl": "https://your-storage-host/schedule.pdf"
  }
}
```

Example request for a screenshot:

```json
{
  "sourceType": "screenshot",
  "asset": {
    "uri": "file:///ignored-by-backend.jpg",
    "name": "schedule.jpg",
    "mimeType": "image/jpeg",
    "size": 12345,
    "storagePath": "schedule-assets/abc.jpg",
    "downloadUrl": "https://your-storage-host/schedule.jpg"
  }
}
```

Example request for a link:

```json
{
  "sourceType": "link",
  "link": {
    "url": "https://example.com/competition"
  }
}
```

## Notes

- This is a production-oriented stub, not a finished parser.
- For `link` parsing, the stub currently sends the URL as model context. In production, you should fetch and sanitize the linked page content server-side before sending it to the model.
- For PDFs, the backend uses `input_file` with `file_url`.
- For screenshots, the backend uses `input_image` with `image_url`.
- The schema is intentionally strict to reduce malformed schedule payloads.

## Next upgrades

- Add server-side page fetch + HTML cleanup for link imports
- Add authentication on the parser endpoint
- Add retries and schema validation before returning to the app
- Add observability for parse failures and low-confidence rows
