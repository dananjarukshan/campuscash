# CampusCash

Phase 1 is a browser-only React + TypeScript + Vite MVP for Sri Lankan students to record income and expenses in LKR. It includes local daily, weekly, monthly and custom-range analytics, filters, charts, and JSON backup/recovery.

## Run locally

```bash
npm install
npm run dev
```

Validate with `npm run build`, `npm run lint`, and `npm test`.

## GitHub Pages deployment

This repository is configured for a project Pages URL at `/<repository-name>/`. For the expected public repository name `campuscash`, the URL will be:

```text
https://<your-github-username>.github.io/campuscash/
```

1. Create a **public** GitHub repository named `campuscash`.
2. Push this project to the `main` branch.
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment > Source**, select **GitHub Actions**.
5. Open the **Actions** tab and inspect the deployment run.
6. Open the Pages URL shown by the completed workflow.
7. Add a transaction and refresh the page to verify local browser persistence.

The workflow uses Node LTS, `npm ci`, `npm run build`, `configure-pages`, the `dist` artifact, and `deploy-pages`. It requests only `contents: read`, `pages: write`, and `id-token: write`. No remote repository or deployment was created from this workspace.

## MVP limits

- Data is stored only in this browser's localStorage. There is no account, login, backend, database, sync, export, or cross-device access.
- Clearing browser storage can permanently remove records. Storage read/write failures are surfaced and never intentionally wipe existing data.
- Amounts are positive and stored as integer cents; this MVP does not support recurring transactions, budgets, reports, attachments, or multi-currency.
- Phase 1 supports one optional note (maximum 500 characters), required Food subcategories, and local-date entry.
- Analytics use local calendar dates: weeks start on Monday and all range ends are inclusive. Charts also include text tables for accessibility and small screens.

## Backups

Use **Export all records** to download a versioned JSON backup containing all transactions and relevant range preferences. Keep the file somewhere safe; it is not uploaded anywhere. Use **Import backup** to choose a valid JSON file up to 2 MB, then explicitly type `merge` or `replace` and confirm the change. Merge keeps existing records with matching IDs and adds only new records; replace uses the imported records.

Backups do not bypass the browser-only limit: they are manual files, not synchronization. Browser storage may be cleared by the user, browser settings, private browsing cleanup, or storage pressure.

## Shared university laptops

“Browser-only” means records are saved in that browser profile on that device, not in an account. Anyone using the same profile may be able to open them, and private/incognito sessions may discard them when closed. Always export a backup before clearing data or changing devices, and do not use CampusCash on a shared machine for records you cannot safely leave there.
