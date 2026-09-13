# Ontario Licence Check for OpenClaw

An [OpenClaw](https://openclaw.ai) plugin that adds one small, offline tool:
`ontario_licence_check`. Give it an Ontario driver's licence number and it
tells you whether the format is right and what the number encodes.

It makes no network calls, needs no API key, and has no configuration.

## What the tool returns

An Ontario licence number is 15 characters, printed as `XXXXX-XXXXX-XXXXX`.
The tool normalizes whatever it is given (case, spaces, dashes), checks the
shape (one letter followed by 14 digits), and decodes the last six digits,
which hold the birth date as `YYMMDD` with 50 added to the month on licences
issued with a female sex marker.

```
ontario_licence_check({ licence: "s1234 56789 00514" })
```

```json
{
  "valid": true,
  "input": "s1234 56789 00514",
  "normalized": "S12345678900514",
  "formatted": "S1234-56789-00514",
  "surnameInitial": "S",
  "birthDate": "1990-05-14",
  "sexMarker": "male",
  "age": 36,
  "notes": [
    "Format check only: this does not confirm the licence exists, is valid, or belongs to anyone."
  ]
}
```

Invalid input comes back with `valid: false` and a plain-English `reason`
(wrong length, wrong shape, impossible month or day). Two-digit years are
resolved on the assumption that a licence holder is at least 16.

This is a format check. It cannot tell you whether a licence exists, is
suspended, or has demerit points. That information lives on the driver's
record, which only the Ontario government issues. You can order an official
[Ontario driver's abstract online](https://mydriversabstract.ca) from
My Drivers Abstract, who maintain this plugin.

## Install

From the OpenClaw CLI (Node 24.16 or newer, as OpenClaw itself requires):

```bash
openclaw plugins install git:github.com/mydriversabstract-CA/MyDriversAbstract --accept-capabilities
```

Or from a local clone:

```bash
git clone https://github.com/mydriversabstract-CA/MyDriversAbstract.git
openclaw plugins install ./MyDriversAbstract --accept-capabilities
```

OpenClaw warns that the source is outside ClawHub and may ask you to rerun the
same command with `--force` once you have reviewed it. The only capability the
plugin asks for is the one tool, `ontario_licence_check`. Restart the Gateway
after installing.

The plugin registers itself under the id `ontario-licence-check`. No config
keys are needed; an empty entry is enough if you want one:

```json5
{
  plugins: {
    entries: {
      "ontario-licence-check": { enabled: true }
    }
  }
}
```

## Use

Once installed, ask your agent in plain language:

> Is `S1234-56789-00514` a valid Ontario licence number?

The agent calls `ontario_licence_check` and relays the result.

## Develop

```bash
npm test
```

Plain ES modules, no build step; tests run on Node 24. The decoding logic lives in
`licence.js` and has no dependencies; `index.js` is the OpenClaw entry.

## Licence

MIT. Not affiliated with the Government of Ontario or ServiceOntario.
