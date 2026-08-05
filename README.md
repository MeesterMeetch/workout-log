# Workout Log

A small private workout tracker for a two person home gym. Four day dumbbell split with a Week A and Week B rotation, built around progressing the Arnold press. Every logged set is saved to Postgres so history sticks around.

Stack: Express 5, node-postgres, React 18, Vite. One web service, one database, no build tooling beyond Vite.

## The routine

Week A

1. Legs and glutes. Goblet squat, Romanian deadlift.
2. Upper push. Arnold press, dumbbell floor press.
3. Legs and glutes. Bulgarian split squat, hip thrust.
4. Upper pull. Dumbbell row, bicep curl.

Week B

1. Legs and glutes. Dumbbell reverse lunge, single leg deadlift.
2. Upper push. Arnold press, dumbbell incline press.
3. Legs and glutes. Dumbbell step up, hip thrust.
4. Upper pull. Renegade row, hammer curl.

Run Week A for two weeks, then Week B for two weeks, then repeat. The Arnold press appears in both weeks and shares one history, so progress on it is continuous.

To change the lifts, edit `client/src/routine.js`. Keep an exercise id stable and its history follows it.

## Deploy on Render

1. Push this repo to GitHub.
2. In Render, choose New, then Blueprint, and select the repo. The `render.yaml` file creates the web service and the Postgres database together.
3. Set the `APP_USERS` environment variable on the web service. Format is `username:password:DisplayName`, comma separated. Example: `mitch:somepassword:Mitch,chelsea:otherpassword:Chelsea`
4. Deploy. Tables are created on first boot and users are seeded from `APP_USERS`.

Changing a password means editing `APP_USERS` and redeploying, since passwords are hashed from that variable on every boot.

### About the free database

A free Render Postgres database expires 30 days after it is created, with a short grace period to upgrade before the data is deleted, and it has no backups. Two ways to keep history permanently:

1. Upgrade the database to a paid instance type in the Render dashboard.
2. Create a free Neon database, delete the `databases` block from `render.yaml`, and set `DATABASE_URL` on the web service to the Neon connection string. No code changes needed.

Either way it is worth running `pg_dump` occasionally if the history matters.

## Local development

```
npm install
cp .env.example .env   # then fill in a local DATABASE_URL
npm run dev:server     # api on port 3000
npm run dev:client     # vite on port 5173, proxies /api to 3000
```

Load the app at `http://localhost:5173`.

## Notes

Vite and the React plugin live in `dependencies` rather than `devDependencies` on purpose, so the Render build still works when the install runs in production mode.
