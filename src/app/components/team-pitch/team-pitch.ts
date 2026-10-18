import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PitchPlayerStats {
  minutes: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  saves: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  yellow_cards: number;
  red_cards: number;
}

export interface PitchPlayer {
  name: string;
  club: string;
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  badge: string;
  photo: string;
  points: number;
  captain: boolean;
  viceCaptain: boolean;
  stats: PitchPlayerStats;
}

@Component({
  selector: 'app-team-pitch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-pitch.html',
  styleUrl: './team-pitch.css',
})
export class TeamPitchComponent {
  view: 'pitch' | 'list' = 'pitch';
  selectedPlayer: PitchPlayer | null = null;
  @Input() starters: PitchPlayer[] = [];
  @Input() substitutes: PitchPlayer[] = [];
  @Input() gameweek = 0;
  @Input() totalPoints = 0;

  showView(view: 'pitch' | 'list'): void {
    this.view = view;
  }

  selectPlayer(player: PitchPlayer): void {
    this.selectedPlayer = this.selectedPlayer?.name === player.name
      ? null
      : player;
  }

  getHighlightStats(player: PitchPlayer): Array<{ label: string; value: number }> {
    const stats = player.stats ?? {
      minutes: 0,
      total_points: 0,
      goals_scored: 0,
      assists: 0,
      saves: 0,
      clean_sheets: 0,
      goals_conceded: 0,
      bonus: 0,
      yellow_cards: 0,
      red_cards: 0,
    };

    return [
      { label: 'Minutes', value: stats.minutes },
      { label: 'Goals', value: stats.goals_scored },
      { label: 'Assists', value: stats.assists },
      { label: 'Saves', value: stats.saves },
      { label: 'Clean sheets', value: stats.clean_sheets },
      { label: 'Points', value: stats.total_points },
    ];
  }

  useBadgeFallback(event: Event, player: PitchPlayer): void {
    const image = event.currentTarget as HTMLImageElement;
    image.onerror = null;
    image.src = player.badge;
  }
}