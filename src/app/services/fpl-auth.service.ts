import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { FplApiService, FplManager } from './fpl-api.service';

export type FplConnectionStatus = 'not-connected' | 'connected' | 'failed';

@Injectable({ providedIn: 'root' })
export class FplAuthService {
  private readonly api = inject(FplApiService);
  private readonly statusSignal = signal<FplConnectionStatus>('not-connected');
  private readonly managerSignal = signal<FplManager | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly manager = this.managerSignal.asReadonly();

  constructor() {
    if (typeof sessionStorage === 'undefined') return;
    const storedManager = sessionStorage.getItem('fpl-manager-profile');
    if (!storedManager) return;
    try {
      this.managerSignal.set(JSON.parse(storedManager) as FplManager);
      this.statusSignal.set('connected');
    } catch {
      sessionStorage.removeItem('fpl-manager-profile');
    }
  }

  getConnectionStatus(): FplConnectionStatus {
    return this.statusSignal();
  }

  connectManager(managerId: number): Observable<FplManager> {
    return this.api.getManager(managerId).pipe(
      tap({ next: (manager) => {
        this.managerSignal.set(manager);
        this.statusSignal.set('connected');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('fpl-manager-id', String(manager.id));
          sessionStorage.setItem('fpl-manager-profile', JSON.stringify(manager));
        }
      }, error: () => this.statusSignal.set('failed') }),
    );
  }

  logout(): void {
    this.managerSignal.set(null);
    this.statusSignal.set('not-connected');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('fpl-manager-id');
      sessionStorage.removeItem('fpl-manager-profile');
    }
  }
}
