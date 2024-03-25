# wilt

[![Deploy](https://github.com/triihim/wilt-backend/actions/workflows/deploy.yml/badge.svg)](https://github.com/triihim/wilt-backend/actions/workflows/deploy.yml)

[Wilt](https://wilt.triihimaki.com) (**W**hat **I** **L**earned **T**oday) is a hobby project with a focus on evolving into a learning journal with AI capabilities. Currently, the app allows users to document their learnings. In the future, the goal is to expand functionality to support the addition of both manually created and AI-generated flashcards. This feature aims to enhance the learning experience and will be complemented by statistics to track and motivate users in their learning journeys.

## Requirements to run

- VSCode devcontainers https://code.visualstudio.com/docs/devcontainers/containers

## Running the app locally

> [!IMPORTANT]
> This repository contains only the backend of the application, the frontend is available at https://github.com/triihim/wilt-web.

Open the project in a devcontainer. This sets up the development environment including a postgresql database. Once the devcontainer is running, run:

```bash
# install dependencies
npm install

# start the server
npm start
```

The server starts on port configured in [/env/development.env](/env/development.env) and should be accessible at `http://localhost:<port>`

## TODO

- Add more tests
- Statistics API feature
- Flashcards API feature
- Document running the app locally without devcontainer
