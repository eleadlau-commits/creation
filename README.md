# Creation

A place for relating ideas. Ideas live in rooms; each room can be seen through
different ontologies (a plain memo, a graph, fuzzy fields) that share the same
items but keep their own structure.

## Run it

The app uses JavaScript modules, which browsers only load from a web server,
not from a double-clicked file. From this folder:

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Your workspace is saved in the browser you use. Use **Settings → Data →
Download backup** now and then; the backup includes images.

## Put it online with GitHub Pages

Push this folder to a GitHub repository, then in the repository go to
**Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`,
and save. The site appears at `https://<your-username>.github.io/<repository>/`.

## Changing it

See [ARCHITECTURE.md](ARCHITECTURE.md).
