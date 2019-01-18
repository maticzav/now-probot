# now-probot

[![CircleCI](https://circleci.com/gh/maticzav/now-probot/tree/master.svg?style=shield)](https://circleci.com/gh/maticzav/now-probot/tree/master)
[![codecov](https://codecov.io/gh/maticzav/now-probot/branch/master/graph/badge.svg)](https://codecov.io/gh/maticzav/now-probot)

> `probot` builder for Now 2.0.

## Usage

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "now-probot",
      "config": {
        "appId": 100,
        "webhookSecret": "secret",
        "privateKey": "cert"
      }
    }
  ]
}
```

## License

MIT @ Matic Zavadlal
