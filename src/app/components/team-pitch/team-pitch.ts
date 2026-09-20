import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PitchPlayer {
  name: string;
  club: string;
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  badge: string;
  points: number;
  captain: boolean;
  viceCaptain: boolean;
}

@Component({
  selector: 'app-team-pitch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-pitch.html',
  styleUrl: './team-pitch.css',
})
export class TeamPitchComponent {
  @Input() starters: PitchPlayer[] = [];
  @Input() substitutes: PitchPlayer[] = [];
  @Input() gameweek = 0;
  @Input() totalPoints = 0;
}