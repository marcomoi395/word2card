# Word2Card

Word2Card is an Electron desktop app that turns word lists or Notion vocabulary pages into Anki flashcards. It generates dictionary content with OpenAI, optionally finds an image with Pexels, and submits the result to Anki through AnkiConnect.

## Features

- Import words from a `.txt` file or a Notion database.
- Generate part of speech, Vietnamese meaning, IPA, examples, and image queries with OpenAI.
- Optionally attach images from Pexels.
- Create and submit cards directly to Anki.
- Use Anki's built-in text-to-speech (TTS) for pronunciation. Word2Card does not call a speech API or create MP3 files.
- Mark synced Notion pages after cards are submitted.

## Requirements

1. **Anki Desktop** must be installed and running.
2. **AnkiConnect** must be installed and enabled in Anki. Use shared add-on code `2055492159`, then restart Anki.
3. An **OpenAI API key** is required for card content generation.
4. A **Pexels API key** is optional and only needed for images.
5. Notion credentials are optional and only needed for Notion Sync.

## Pronunciation and platform support

New cards use the Anki template tag `{{tts en_US:word}}`. Audio is synthesized when the card is reviewed, using voices available to Anki on that device. No audio provider key, generated media file, or extra Word2Card service is required.

| Platform | TTS support | What the user needs to do |
| --- | --- | --- |
| Windows | Built in | Install an English system voice if none is available. |
| macOS / iOS | Built in | Install or enable an English system voice if needed. |
| Android (AnkiDroid) | Supported by AnkiDroid | Make sure an English Android TTS engine/voice is installed. |
| Linux | No voice is bundled with Anki | Install a compatible Anki TTS add-on/voice provider, then restart Anki. |

The TTS tag requires Anki 2.1.20+, AnkiMobile 2.0.56+, or AnkiDroid 2.17+. Voice availability and pronunciation can differ between operating systems. Anki's official documentation has the [TTS template reference](https://docs.ankiweb.net/templates/fields.html#text-to-speech-for-individual-fields).

Word2Card creates the note type `AnkiVNModel_Flashcard_TTS`. Existing note types and cards are not overwritten, so the first sync after upgrading may create this additional note type.

## Setup

1. Start Anki and confirm that AnkiConnect is available.
2. Start Word2Card and open **Settings**.
3. Enter the OpenAI API key. Add Pexels or Notion credentials only if you use those features.
4. Save the settings and check the provider status indicators.

## Usage

### File import

1. Prepare a UTF-8 text file with one English word per line.
2. Open **File Import**, choose the file and an Anki deck, and submit it.
3. Review the generated rows and submit the ready cards to Anki.

### Notion Sync

1. Duplicate the [Vocabulary Book template](https://ym19.notion.site/2f08dbf4be72815ab996d6cb491ef10b?v=2f08dbf4be7281c08c71000c404fb391).
2. Create a Notion integration at [Notion My Integrations](https://www.notion.so/my-integrations).
3. Share the database with that integration and copy the database ID from its URL.
4. Enter the token, database ID, and target deck in **Notion Sync**.

## Development

```bash
bun install
bun run dev
```

Run checks:

```bash
bun run test
bun run typecheck
bun run build
```

Build installers:

```bash
bun run build:win
bun run build:mac
bun run build:linux
```

## Privacy and costs

Word2Card sends imported words to the configured OpenAI-compatible endpoint for content generation. Pexels and Notion are contacted only when those features are used. Pronunciation is handled locally by Anki and the operating system (or an Anki TTS add-on on Linux); there is no Azure Speech integration and no separate audio billing.

## License

See [LICENSE](LICENSE).
