# Plant Guardian — Frontend (Team 1)

Dashboard for the core plant platform: add/edit/delete plants, filter by location,
see risk scores, and mark plants as watered.

## Setup

```bash
npm install
npm start
```

Opens at `http://localhost:3000`. By default it talks to the backend at
`http://127.0.0.1:8000` — make sure that's running.

To point at a different backend (e.g. once deployed to Cloud Run), create a
`.env` file:

```
REACT_APP_API_URL=https://your-backend-url.run.app
```

## What's here

- `src/components/PlantTracker.jsx` — main dashboard, location filters
- `src/components/PlantCard.jsx` — plant card with risk display + "Just Watered"
- `src/components/AddPlantModal.jsx` — add plant form

No auth, no analytics dashboard — those aren't part of Team 1's scope.
