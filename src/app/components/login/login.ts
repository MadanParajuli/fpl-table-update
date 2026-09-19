import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FplAuthService } from '../../services/fpl-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly auth = inject(FplAuthService);
  private readonly router = inject(Router);
  managerId = '';
  readonly manager = this.auth.manager;
  readonly loading = signal(false);
  readonly error = signal('');

  connectManager(): void {
    const id = Number(this.managerId.trim());

    if (!Number.isInteger(id) || id < 1) {
      this.error.set(
        'Enter a valid numeric FPL manager ID.'
      );
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.connectManager(id).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/home');
      },

      error: () => {
        this.error.set(
          'FPL could not be reached from this browser. Check the ID or try again later.'
        );
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.managerId = '';
    this.error.set('');
  }
}
