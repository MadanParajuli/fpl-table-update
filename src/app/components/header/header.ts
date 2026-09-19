import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FplAuthService } from '../../services/fpl-auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  private readonly auth = inject(FplAuthService);
  readonly manager = this.auth.manager;
  readonly gameweek = computed(() => this.manager()?.current_event ?? '—');
  readonly initials = computed(() => {
    const manager = this.manager();
    if (!manager) return 'FPL';
    return `${manager.player_first_name.charAt(0)}${manager.player_last_name.charAt(0)}`.toUpperCase();
  });
}
