# now-probot

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
