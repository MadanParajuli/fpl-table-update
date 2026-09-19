# FPL Central

An Angular frontend with the project's existing Express SSR relay for exploring Fantasy Premier League classic leagues.

## User flow

1. Open `/login`.
2. Enter an FPL Manager ID, for example `3296740`.
3. Submit the form or press Enter.
4. The app loads the manager profile and joined classic leagues.
5. The app navigates to `/home`.
6. Select a league to load its standings.
7. Each standing manager's public history is loaded and displayed across Gameweeks 1 to 38.
8. Completed gameweeks show points; future gameweeks show `—`.

The application does not ask for an FPL username or password. Manager ID lookup uses public FPL data only.

## API endpoints

The frontend calls these official public endpoints:

```text
GET https://fantasy.premierleague.com/api/entry/{managerId}/
GET https://fantasy.premierleague.com/api/entry/{managerId}/leagues/
GET https://fantasy.premierleague.com/api/leagues-classic/{leagueId}/standings/
GET https://fantasy.premierleague.com/api/entry/{managerId}/history/
```

For a league table, the app calls the standings endpoint for the selected league and then calls the history endpoint for each manager in that standings response. The history response's `current` array provides each manager's weekly points and cumulative totals.

Direct browser requests to FPL can be blocked by CORS. The Angular app therefore calls same-origin `/api/**` routes exposed by the Express SSR server. The server fetches public FPL data and returns it to the browser.

## Express API relay

`src/server.ts` exposes narrow internal routes for manager profiles, joined leagues, league standings, manager history, bootstrap data, and fixtures. These routes call `https://fantasy.premierleague.com/api` server-side, so the browser never makes a cross-origin request to FPL.

Start the application with the Express SSR relay:

```bash
npm start
```

This builds the Angular app and starts the SSR server with the relay on port 4000. For Angular-only development, use `npm run start:dev`, but the internal Express relay must still be running separately.

To start only the Express relay after an existing build:

```bash
npm run start:ssr
```

Then verify the sample manager request through the internal endpoint:

```bash
curl http://localhost:4000/api/entry/3296740/
```

The relay is part of the SSR Express server and can be deployed with that server. A static-only Angular deployment still cannot use these server routes and would require a separately hosted serverless/API proxy. No separate application backend or database is included; this is the existing SSR host serving a small public-data relay.

## Routes

- `/login`: Manager ID entry.
- `/home`: account summary, joined leagues, and standings table.
- `/`: redirects to `/home`.
- Unknown routes redirect to `/home`.

## Project structure

- `src/app/services/fpl-api.service.ts`: typed HTTP calls to official public FPL endpoints.
- `src/app/services/fpl-auth.service.ts`: connected manager state and session persistence.
- `src/app/components/login/`: Manager ID entry and validation.
- `src/app/components/dashboard/`: league selector and 38-week standings table.
- `src/app/components/header/`: application navigation.
- `src/app/components/footer/`: FPL data footer.

## Storage

The connected manager profile and Manager ID are stored in `sessionStorage` to survive a page refresh during the browser session. The app never stores passwords, access tokens, refresh tokens, cookies, or authentication headers.

## Development

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

## Validation

```bash
npm test -- --watch=false
npm run build
```

The tests mock all FPL calls and never use real credentials or live authentication tokens.

## League balance export

The selected league dashboard has an `Export balance sheet` button. It downloads an `.xlsx` workbook with one worksheet for that league. The sheet includes:

- Manager name
- Number of gameweeks won
- Previous balance
- Present gameweek balance, always `-$5` per manager
- Cumulative winning balance
- Total balance
- Reserved Balance row

The calculation uses an entry fee of `$5` per available gameweek. Previous Balance is calculated from all earlier available gameweeks. The present Game Week balance is always `-$5` per manager. The manager with the highest current FPL gameweek points receives `manager count × $5 - $5`; all other managers receive `$0` in Winning Balance. Ties are resolved by the current FPL standings rank. The remaining `$5` is added to Reserved Balance for each available gameweek.

FPL does not provide the external balance sheet's starting balance, so exports currently use a documented starting balance assumption of `$0`. The reserved balance is initially `$0`. Change those assumptions in `fpl-league-export.service.ts` if the league has an established carry-over balance.
