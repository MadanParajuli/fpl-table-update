import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface FplManager {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  current_event: number;
  leagues?: {
    classic: FplLeague[];
    h2h: unknown[];
    cup: unknown;
  };
}

export interface FplLeague {
  id: number;
  name: string;
  created: string;
  admin_entry: number | null;
  rank: number | null;
  entry_rank: number | null;
  entry_last_rank: number | null;
  rank_count?: number;
  start_event?: number;
}

export interface BootstrapStatic {
  events: Array<{
    id: number;
    name: string;
    deadline_time: string;
    finished: boolean;
    is_current: boolean;
    is_next: boolean;
  }>;
}

export interface FplStanding {
  entry: number;
  entry_name: string;
  event_total: number;
  last_rank: number;
  player_name: string;
  rank: number;
  rank_sort: number;
  total: number;
  club_badge_src: string | null;
}

export interface FplLeagueStandings {
  league: FplLeague;
  standings: {
    has_next: boolean;
    page: number;
    results: FplStanding[];
  };
  last_updated_data: string;
}

export interface FplHistoryEvent {
  event: number;
  points: number;
  total_points: number;
}

export interface FplHistory {
  current: FplHistoryEvent[];
}

export interface FplPick {
  element: number;
  position: number;
  multiplier: number;
  element_type: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplManagerPicks {
  active_chip: string | null;
  picks: FplPick[];
}

export interface FplLiveElement {
  id: number;
  stats: {
    minutes: number;
    total_points: number;
  };
}

export interface FplLiveEvent {
  elements: FplLiveElement[];
}

@Injectable({ providedIn: 'root' })
export class FplApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  getBootstrap(): Observable<BootstrapStatic> {
    return this.http.get<BootstrapStatic>(
      `${this.apiBase}/bootstrap-static/`
    );
  }

  getManager(managerId: number): Observable<FplManager> {
    return this.http.get<FplManager>(
      `${this.apiBase}/entry/${managerId}/`
    );
  }

  getLeagueStandings(
    leagueId: number
  ): Observable<FplLeagueStandings> {
    return this.http.get<FplLeagueStandings>(
      `${this.apiBase}/leagues-classic/${leagueId}/standings/`
    );
  }

  getManagerHistory(managerId: number): Observable<FplHistory> {
    return this.http.get<FplHistory>(
      `${this.apiBase}/entry/${managerId}/history/`
    );
  }

  getManagerPicks(
    managerId: number,
    event: number
  ): Observable<FplManagerPicks> {
    return this.http.get<FplManagerPicks>(
      `${this.apiBase}/entry/${managerId}/event/${event}/picks/`
    );
  }

  getLiveEvent(event: number): Observable<FplLiveEvent> {
    return this.http.get<FplLiveEvent>(
      `${this.apiBase}/event/${event}/live/`
    );
  }

  getFixtures(): Observable<unknown[]> {
    return this.http.get<unknown[]>(
      `${this.apiBase}/fixtures/`
    );
  }
}