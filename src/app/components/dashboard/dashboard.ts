import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FplApiService,
  BootstrapStatic,
  FplHistory,
  FplLeague,
  FplLiveEvent,
  FplManager,
  FplManagerPicks,
  FplStanding,
} from '../../services/fpl-api.service';
import { FplAuthService } from '../../services/fpl-auth.service';
import {
  BalanceSheet,
  FplLeagueExportService,
} from '../../services/fpl-league-export.service';
import {
  PitchPlayer,
} from '../team-pitch/team-pitch';
import { TeamPitchComponent } from '../team-pitch/team-pitch';

export interface LeagueTableRow extends FplStanding {
  weeklyPoints: Record<number, number>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TeamPitchComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(FplApiService);
  private readonly auth = inject(FplAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exporter = inject(FplLeagueExportService);

  readonly leagues = signal<FplLeague[]>([]);
  readonly selectedLeague = signal<FplLeague | null>(null);
  readonly rows = signal<LeagueTableRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly currentEvent = signal(0);
  readonly gameweeks = Array.from(
    { length: 38 },
    (_, index) => index + 1
  );
  readonly manager = signal<FplManager | null>(null);
  readonly showBalanceSheet = signal(false);
  readonly balanceSheet = signal<BalanceSheet | null>(null);
  readonly selectedBalanceWeek = signal(0);
  readonly squad = signal<PitchPlayer[]>([]);
  readonly squadPoints = signal(0);
  readonly activeView = signal<'standings' | 'squad'>('standings');

  setView(view: 'standings' | 'squad'): void {
    this.activeView.set(view);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const routeManagerId = Number(params.get('managerId'));
      const connectedManager = this.auth.manager();

      if (
        Number.isInteger(routeManagerId) &&
        routeManagerId > 0
      ) {
        this.loadManager(routeManagerId);
      } else if (connectedManager) {
        this.loadManagerProfile(connectedManager);
      } else {
        this.router.navigateByUrl('/login');
      }
    });
  }

  selectLeague(league: FplLeague): void {
    this.selectedLeague.set(league);
    this.rows.set([]);
    this.showBalanceSheet.set(false);
    this.balanceSheet.set(null);
    this.selectedBalanceWeek.set(this.currentEvent());
    this.loading.set(true);
    this.error.set('');

    this.api.getLeagueStandings(league.id).subscribe({
      next: (response) =>
        this.loadHistories(response.standings.results),

      error: () => {
        this.loading.set(false);
        this.error.set(
          'This league table could not be loaded from FPL.'
        );
      },
    });
  }

  pointsFor(
    row: LeagueTableRow,
    event: number
  ): number | null {
    return row.weeklyPoints[event] ?? null;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  exportBalanceSheet(): void {
    const league = this.selectedLeague();

    if (league && this.rows().length) {
      this.exporter.exportLeague(
        league,
        this.rows(),
        this.selectedBalanceWeek()
      );
    }
  }

  balanceWeeks(): number[] {
    return this.gameweeks.filter(
      (week) => week <= this.currentEvent()
        && this.rows().some((row) => row.weeklyPoints[week] !== undefined)
    );
  }

  selectBalanceWeek(event: Event): void {
    const week = Number((event.target as HTMLSelectElement).value);
    if (!this.balanceWeeks().includes(week)) return;

    this.selectedBalanceWeek.set(week);
    this.balanceSheet.set(
      this.exporter.createBalanceSheet(this.rows(), week)
    );
  }

  toggleBalanceSheet(): void {
    if (this.showBalanceSheet()) {
      this.showBalanceSheet.set(false);
      return;
    }

    const sheet = this.exporter.createBalanceSheet(
      this.rows(),
      this.selectedBalanceWeek() || this.currentEvent()
    );
    this.balanceSheet.set(sheet);
    if (sheet) this.selectedBalanceWeek.set(sheet.presentWeek);

    this.showBalanceSheet.set(true);
  }

  private loadManager(managerId: number): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getManager(managerId).subscribe({
      next: (manager) =>
        this.loadManagerProfile(manager),

      error: () => {
        this.loading.set(false);
        this.error.set(
          'This manager profile could not be loaded from FPL.'
        );
      },
    });
  }

  private loadManagerProfile(
    manager: FplManager
  ): void {
    this.manager.set(manager);
    this.currentEvent.set(manager.current_event || 0);
    this.selectedBalanceWeek.set(manager.current_event || 0);
    this.loadSquad(manager.id);

    const classic = manager.leagues?.classic ?? [];

    this.leagues.set(classic);

    if (classic.length) {
      this.selectLeague(classic[0]);
    } else {
      this.loading.set(false);
      this.error.set(
        'No classic leagues were found for this Manager ID.'
      );
    }
  }

  private loadSquad(managerId: number): void {
    const event = this.currentEvent();
    if (!event) return;

    forkJoin({
      picks: this.api.getManagerPicks(managerId, event).pipe(
        catchError(() => of(null as FplManagerPicks | null))
      ),
      bootstrap: this.api.getBootstrap().pipe(
        catchError(() => of(null as BootstrapStatic | null))
      ),
      live: this.api.getLiveEvent(event).pipe(
        catchError(() => of(null as FplLiveEvent | null))
      ),
    }).subscribe(({ picks, bootstrap, live }) => {
      const livePoints = this.toLivePoints(live);
      this.squad.set(this.toSquad(picks, bootstrap, livePoints));
      this.squadPoints.set(this.currentPoints(picks, livePoints, 0));
    });
  }

  private toSquad(
    picks: FplManagerPicks | null,
    bootstrap: BootstrapStatic | null,
    livePoints: Map<number, { minutes: number; total_points: number }>
  ): PitchPlayer[] {
    if (!picks || !bootstrap) return [];

    const players = new Map(bootstrap.elements.map((player) => [player.id, player]));
    const teams = new Map(bootstrap.teams.map((team) => [team.id, team]));
    const positions: Record<number, PitchPlayer['position']> = {
      1: 'goalkeeper',
      2: 'defender',
      3: 'midfielder',
      4: 'forward',
    };

    return picks.picks.map((pick) => {
      const player = players.get(pick.element);
      const team = player ? teams.get(player.team) : undefined;
      return {
        name: player?.web_name ?? `Player ${pick.element}`,
        club: team?.name ?? 'Unknown club',
        position: positions[pick.element_type] ?? 'midfielder',
        badge: team ? `https://resources.premierleague.com/premierleague/badges/70/t${team.code}.png` : '',
        points: (livePoints.get(pick.element)?.total_points ?? 0)
          * Math.max(1, pick.multiplier),
        captain: pick.is_captain,
        viceCaptain: pick.is_vice_captain,
      };
    });
  }

  private loadHistories(
    standings: FplStanding[]
  ): void {
    if (!standings.length) {
      this.loading.set(false);
      return;
    }

    const currentEvent = this.currentEvent();

    forkJoin({
      histories: forkJoin(
        standings.map((standing) =>
          this.api
            .getManagerHistory(standing.entry)
            .pipe(
              catchError(() =>
                of({ current: [] } as FplHistory)
              )
            )
        )
      ),

      picks: forkJoin(
        standings.map((standing) =>
          this.api
            .getManagerPicks(
              standing.entry,
              currentEvent
            )
            .pipe(
              catchError(() =>
                of(null as FplManagerPicks | null)
              )
            )
        )
      ),

      live: this.api
        .getLiveEvent(currentEvent)
        .pipe(
          catchError(() =>
            of(null as FplLiveEvent | null)
          )
        ),
    }).subscribe(({ histories, picks, live }) => {
      const livePoints = this.toLivePoints(live);

      this.rows.set(
        standings.map((standing, index) => ({
          ...standing,

          weeklyPoints: this.toWeeklyPoints(
            histories[index],
            currentEvent,
            this.currentPoints(
              picks[index],
              livePoints,
              standing.event_total
            )
          ),
        }))
      );

      this.loading.set(false);
    });
  }

  private currentPoints(
    picks: FplManagerPicks | null,
    livePoints: Map<number, { minutes: number; total_points: number }>,
    fallback: number
  ): number {
    if (!picks) return fallback;

    const benchBoost = picks.active_chip === 'benchboost'
      || picks.active_chip === 'bboost';
    const starters = picks.picks
      .filter((pick) => pick.position <= 11)
      .sort((left, right) => left.position - right.position);
    const bench = picks.picks
      .filter((pick) => pick.position > 11)
      .sort((left, right) => left.position - right.position);

    if (benchBoost) {
      return picks.picks.reduce(
        (total, pick) => total + this.pickPoints(pick, livePoints, 1),
        0
      );
    }

    const activeStarters = starters.filter((pick) => this.played(pick, livePoints));
    const playerTypes = activeStarters.map((pick) => pick.element_type);
    const selected = [...activeStarters];

    for (const starter of starters.filter((pick) => !this.played(pick, livePoints))) {
      const replacementIndex = bench.findIndex((candidate) =>
        this.canReplace(starter, candidate, playerTypes)
        && this.played(candidate, livePoints)
      );
      if (replacementIndex === -1) continue;

      const replacement = bench.splice(replacementIndex, 1)[0];
      selected.push(replacement);
      playerTypes.push(replacement.element_type);
    }

    const captain = starters.find((pick) => pick.is_captain);
    const viceCaptain = starters.find((pick) => pick.is_vice_captain);
    const captainAbsent = captain && !this.played(captain, livePoints);

    return selected.reduce((total, pick) => {
      const multiplier = captainAbsent && viceCaptain?.element === pick.element
        ? 2
        : pick.multiplier || 1;
      return total + this.pickPoints(pick, livePoints, multiplier);
    }, 0);
  }

  private played(
    pick: FplManagerPicks['picks'][number],
    livePoints: Map<number, { minutes: number; total_points: number }>
  ): boolean {
    return (livePoints.get(pick.element)?.minutes ?? 0) > 0;
  }

  private canReplace(
    starter: FplManagerPicks['picks'][number],
    candidate: FplManagerPicks['picks'][number],
    playerTypes: number[]
  ): boolean {
    if (starter.element_type === 1) return candidate.element_type === 1;
    if (candidate.element_type === 1) return false;

    const counts = playerTypes.reduce<Record<number, number>>((result, type) => {
      result[type] = (result[type] ?? 0) + 1;
      return result;
    }, {});
    counts[candidate.element_type] = (counts[candidate.element_type] ?? 0) + 1;

    return (counts[2] ?? 0) >= 3
      && (counts[3] ?? 0) >= 2
      && (counts[4] ?? 0) >= 1;
  }

  private pickPoints(
    pick: FplManagerPicks['picks'][number],
    livePoints: Map<number, { minutes: number; total_points: number }>,
    multiplier: number
  ): number {
    return (livePoints.get(pick.element)?.total_points ?? 0) * multiplier;
  }

  private toLivePoints(
    live: FplLiveEvent | null
  ): Map<number, { minutes: number; total_points: number }> {
    return new Map(
      (live?.elements ?? []).map((element) => [
        element.id,
        element.stats,
      ])
    );
  }

  private toWeeklyPoints(
    history: FplHistory,
    currentEvent: number,
    currentPoints: number
  ): Record<number, number> {
    return {
      ...Object.fromEntries(
        (history.current ?? []).map((event) => [
          event.event,
          event.points,
        ])
      ),

      ...(currentEvent
        ? { [currentEvent]: currentPoints }
        : {}),
    };
  }
}