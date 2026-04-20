## Projekte pflegen (serverlos)

### Admin (Browser CMS)

- Öffne `https://<deine-domain>/admin/`
- Dort kannst du Projekte anlegen/bearbeiten.
- Die Inhalte landen als Dateien im Repo unter `content/projects/<slug>.json`.
- Uploads (Bilder) landen unter `assets/uploads/`.

### Projekt-URL

Da du aktuell keine Rewrites nutzen willst, ist die Projekt-URL:

- `project.html?slug=<slug>`

Beispiel:
- `project.html?slug=example`

### Dateien

- **CMS config**: `admin/config.yml`
- **Projekt-Template**: `project.html` + `project.js`
- **Projekte**: `content/projects/*.json`

