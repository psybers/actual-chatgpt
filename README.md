# Actual Budget + ChatGPT

This project is a simple integration between Actual Budget and OpenAI's ChatGPT
API. It allows you to ask ChatGPT questions about your budget and get answers
back.

## Requirements

- [OpenAI API key](https://platform.openai.com/account/api-keys)
- [Actual Budget](https://actualbudget.org/) (24.4.0+)
- [Node.js](https://nodejs.org/) (21.6.2+)
    - [@actual-app/api](https://www.npmjs.com/package/@actual-app/api) (6.7.0+)
    - [dotenv](https://www.npmjs.com/package/dotenv) (16.4.5+)
    - [openai](https://www.npmjs.com/package/openai) (4.33.0+)

## Configuration

Create a `.env` file in the root directory with the following content:

```python
OPENAI_API_KEY="<OpenAI API key>"
ACTUAL_SERVER_URL="https://<Actual Budget server URL>"
ACTUAL_SERVER_PASSWORD="<Actual Budget server password>"
ACTUAL_SYNC_ID="<Actual Budget Sync ID>"
```

Note that if you already have your OpenAI API key installed for all
applications, you do not need to repeat it here.

## Usage

To ask ChatGPT for suggestions about uncategorized transactions, run:

```bash
node suggest-cats.js
```
