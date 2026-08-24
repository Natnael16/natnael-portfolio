# Deploy — 4 commands

Run these on your computer from an empty folder (replaces the old site, keeps git history):

```bash
git clone https://github.com/Natnael16/natnael-portfolio.git && cd natnael-portfolio
git rm -rq . && unzip -o ~/Downloads/natnael-portfolio.zip -d /tmp/newsite && cp -r /tmp/newsite/natnael-portfolio/. .
git add -A && git commit -m "Complete redesign: premium dark personal brand site"
git push origin main
```

Vercel will auto-deploy `main` — your site at **natnael-portfolio-tau.vercel.app** updates in ~1 minute.

(If `git push` asks for credentials: username `Natnael16`, password = a GitHub personal access token.)

## After deploying

- **Revoke the token you shared in chat** at github.com/settings/tokens — it was exposed in the conversation.
- Check the live site on your phone and desktop.
