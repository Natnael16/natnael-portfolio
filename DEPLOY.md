# Deploy

The site lives at https://github.com/Natnael16/natnael-portfolio and Vercel auto-deploys the `main` branch.

## Shipping a change

```bash
git add -A && git commit -m "Describe the change" && git push origin main
```

Vercel picks up the push and **natnael-portfolio-tau.vercel.app** updates in about a minute.

## Checking it first

```bash
npm run build
```

If the build passes locally it will pass on Vercel.

## Credentials

If `git push` asks for credentials, the username is `Natnael16` and the password is a GitHub personal
access token (not your account password). Tokens are managed at github.com/settings/tokens.

Rotate any token that has been pasted into a chat window, an email, or a shared document. A token grants
the same repo access your account has, so treat it like a password.
