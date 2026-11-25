# Garment Checker

Photograph the label sewn into a piece of clothing and find out what it is made of, where it was made, and what public records say about that.

Claude only *reads* the label (fibres, country, brand, care symbols, registration numbers). It never rates the garment. Everything else comes from reference sources:

| What you see | Where it comes from |
| --- | --- |
| Environmental cost, in impact points | [Ecobalyse](https://ecobalyse.beta.gouv.fr), the French government's life-cycle model for textiles |
| Child and forced labour record for the country of origin | US Department of Labor, [List of Goods Produced by Child Labor or Forced Labor](https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods) (2024 edition, bundled) |
| Factories the brand has disclosed in that country | [Open Supply Hub](https://opensupplyhub.org) |

When a source cannot answer (the fibre is not in its database, the brand has published no factory list, the label has no country), the app says so instead of guessing.

## How it works

```
React app ──POST photos──▶ /api/analyze (Vercel function)
    │                        1. reads the label        api/_lib/label.ts
    │                        2. queries the sources    api/_lib/sources.ts, dol.ts
    └──saves the result──▶ Firestore: users/{uid}/analyses
```

- `src/` is the web app: React 19, TypeScript, Vite, Tailwind 4, English and French.
- `api/` is the backend, one serverless function. It only answers callers with a valid Firebase sign-in token.
- Firebase provides sign-in and the scan history (both on the free plan). `firestore.rules` keeps each user's history private to them.
- Photos are downsized in the browser. The function never stores them; a small thumbnail is saved with the scan.

## Running it

You need Node 22, a Firebase project with Email/Password sign-in and Firestore enabled, and a Vercel account. To use your own Firebase project, replace the config in `src/firebase.ts`, the project id in `.firebaserc` and `FIREBASE_PROJECT` in `api/analyze.ts`.

```bash
npm install
npm run dev
```

The function reads its keys from environment variables. Only the first is required; without the other two, that section of the result reads "not connected yet".

```bash
npx vercel env add ANTHROPIC_API_KEY production       # console.anthropic.com
npx vercel env add ECOBALYSE_TOKEN production         # free account at ecobalyse.beta.gouv.fr
npx vercel env add OPEN_SUPPLY_HUB_TOKEN production   # opensupplyhub.org, Settings
```

Deploy:

```bash
firebase deploy --only firestore:rules
npx vercel deploy --prod
```

## Tests

```bash
npm test
```

covers the parts that decide what the user is told: which labour-list rows apply to a garment, how a label becomes an Ecobalyse query, and how a brand is matched on Open Supply Hub.

## Limits worth knowing

- The environmental cost is for a typical garment of that type (a 150 g T-shirt, a 450 g pair of jeans), because a label does not state the weight. Only the making country is known from a label; Ecobalyse fills in its defaults for spinning, weaving and dyeing.
- The labour list is about countries and goods. A listed country does not mean this factory or brand is involved.
- Ecobalyse covers 14 fibres and 11 garment types. Silk, cashmere, shoes and accessories are not modelled.
- The Department of Labor list is published every two years. Update `api/_lib/dol.ts` when a new edition comes out.
