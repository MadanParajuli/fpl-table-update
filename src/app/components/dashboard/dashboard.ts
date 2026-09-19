import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FplApiService, FplHistory, FplLeague, FplManager, FplStanding } from '../../services/fpl-api.service';
import { FplAuthService } from '../../services/fpl-auth.service';
import { BalanceSheet, FplLeagueExportService } from '../../services/fpl-league-export.service';

export interface LeagueTableRow extends FplStanding { weeklyPoints: Record<number, number>; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
  readonly gameweeks = Array.from({ length: 38 }, (_, index) => index + 1);
  readonly manager = signal<FplManager | null>(null);
  readonly showBalanceSheet = signal(false);
  readonly balanceSheet = signal<BalanceSheet | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const routeManagerId = Number(params.get('managerId'));
      const connectedManager = this.auth.manager();
      if (Number.isInteger(routeManagerId) && routeManagerId > 0) this.loadManager(routeManagerId);
      else if (connectedManager) this.loadManagerProfile(connectedManager);
      else this.router.navigateByUrl('/login');
    });
  }

  selectLeague(league: FplLeague): void {
    this.selectedLeague.set(league);
    this.rows.set([]);
    this.showBalanceSheet.set(false);
    this.balanceSheet.set(null);
    this.loading.set(true);
    this.error.set('');
    this.api.getLeagueStandings(league.id).subscribe({
      next: (response) => this.loadHistories(response.standings.results),
      error: () => { this.loading.set(false); this.error.set('This league table could not be loaded from FPL.'); },
    });
  }

  pointsFor(row: LeagueTableRow, event: number): number | null {
    return row.weeklyPoints[event] ?? null;
  }

  logout(): void { this.auth.logout(); this.router.navigateByUrl('/login'); }

  exportBalanceSheet(): void {
    const league = this.selectedLeague();
    if (league && this.rows().length) this.exporter.exportLeague(league, this.rows(), this.currentEvent());
  }

  toggleBalanceSheet(): void {
    if (this.showBalanceSheet()) {
      this.showBalanceSheet.set(false);
      return;
    }
    this.balanceSheet.set(this.exporter.createBalanceSheet(this.rows(), this.currentEvent()));
    this.showBalanceSheet.set(true);
  }

  private loadManager(managerId: number): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getManager(managerId).subscribe({
      next: (manager) => this.loadManagerProfile(manager),
      error: () => { this.loading.set(false); this.error.set('This manager profile could not be loaded from FPL.'); },
    });
  }

  private loadManagerProfile(manager: FplManager): void {
    this.manager.set(manager);
    this.currentEvent.set(manager.current_event || 0);
    const classic = manager.leagues?.classic ?? [];
    this.leagues.set(classic);
    if (classic.length) this.selectLeague(classic[0]);
    else { this.loading.set(false); this.error.set('No classic leagues were found for this Manager ID.'); }
  }

  private loadHistories(standings: FplStanding[]): void {
    if (!standings.length) { this.loading.set(false); return; }
    forkJoin(standings.map((standing) => this.api.getManagerHistory(standing.entry).pipe(catchError(() => of({ current: [] } as FplHistory))))).subscribe((histories) => {
      const currentEvent = this.currentEvent();
      this.rows.set(standings.map((standing, index) => ({
        ...standing,
        weeklyPoints: this.toWeeklyPoints(histories[index], currentEvent, standing.event_total),
      })));
      this.loading.set(false);
    });
  }

  private toWeeklyPoints(history: FplHistory, currentEvent: number, currentPoints: number): Record<number, number> {
    return {
      ...Object.fromEntries((history.current ?? []).map((event) => [event.event, event.points])),
      ...(currentEvent ? { [currentEvent]: currentPoints } : {}),
    };
  }
}
