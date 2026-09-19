import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(
  import.meta.dirname,
  '../browser'
);
const app = express();
const angularApp = new AngularNodeAppEngine();
const fplApiBase =
  'https://fantasy.premierleague.com/api';

async function proxyFplJson(
  path: string,
  res: express.Response
): Promise<void> {
  try {
    const response = await fetch(
      `${fplApiBase}${path}`,
      {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    const body = await response.text();

    res
      .status(response.status)
      .type('application/json')
      .send(body);
  } catch {
    res
      .status(502)
      .json({ error: 'FPL API is unavailable.' });
  }
}

function numericParam(
  value: string
): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

app.get(
  '/api/entry/:managerId',
  async (req, res) => {
    const managerId = numericParam(
      req.params['managerId']
    );

    if (!managerId) {
      res
        .status(400)
        .json({ error: 'Invalid manager ID.' });
      return;
    }

    await proxyFplJson(
      `/entry/${managerId}/`,
      res
    );
  }
);

app.get(
  '/api/entry/:managerId/leagues',
  async (req, res) => {
    const managerId = numericParam(
      req.params['managerId']
    );

    if (!managerId) {
      res
        .status(400)
        .json({ error: 'Invalid manager ID.' });
      return;
    }

    try {
      const response = await fetch(
        `${fplApiBase}/entry/${managerId}/`,
        {
          headers: {
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      const manager =
        await response.json() as {
          leagues?: {
            classic?: unknown[];
            h2h?: unknown[];
            cup?: unknown;
          };
        };

      res.status(response.status).json({
        classic: manager.leagues?.classic ?? [],
        h2h: manager.leagues?.h2h ?? [],
        cup: manager.leagues?.cup ?? null,
      });
    } catch {
      res
        .status(502)
        .json({ error: 'FPL API is unavailable.' });
    }
  }
);

app.get(
  '/api/entry/:managerId/history',
  async (req, res) => {
    const managerId = numericParam(
      req.params['managerId']
    );

    if (!managerId) {
      res
        .status(400)
        .json({ error: 'Invalid manager ID.' });
      return;
    }

    await proxyFplJson(
      `/entry/${managerId}/history/`,
      res
    );
  }
);

app.get(
  '/api/entry/:managerId/event/:event/picks',
  async (req, res) => {
    const managerId = numericParam(
      req.params['managerId']
    );

    const event = numericParam(
      req.params['event']
    );

    if (!managerId || !event) {
      res
        .status(400)
        .json({
          error: 'Invalid manager or event ID.',
        });
      return;
    }

    await proxyFplJson(
      `/entry/${managerId}/event/${event}/picks/`,
      res
    );
  }
);

app.get(
  '/api/leagues-classic/:leagueId/standings',
  async (req, res) => {
    const leagueId = numericParam(
      req.params['leagueId']
    );

    if (!leagueId) {
      res
        .status(400)
        .json({ error: 'Invalid league ID.' });
      return;
    }

    await proxyFplJson(
      `/leagues-classic/${leagueId}/standings/`,
      res
    );
  }
);

app.get(
  '/api/bootstrap-static',
  async (_req, res) =>
    proxyFplJson(
      '/bootstrap-static/',
      res
    )
);

app.get(
  '/api/event/:event/live',
  async (req, res) => {
    const event = numericParam(
      req.params['event']
    );

    if (!event) {
      res
        .status(400)
        .json({ error: 'Invalid event ID.' });
      return;
    }

    await proxyFplJson(
      `/event/${event}/live/`,
      res
    );
  }
);

app.get(
  '/api/fixtures',
  async (_req, res) =>
    proxyFplJson(
      '/fixtures/',
      res
    )
);

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response
        ? writeResponseToNodeResponse(
            response,
            res
          )
        : next(),
    )
    .catch(next);
});

if (
  isMainModule(import.meta.url) ||
  process.env['pm_id']
) {
  const port = process.env['PORT'] || 4000;

  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(
      `Node Express server listening on http://localhost:${port}`
    );
  });
}

export const reqHandler =
  createNodeRequestHandler(app);
