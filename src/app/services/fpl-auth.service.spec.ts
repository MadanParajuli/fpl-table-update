import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FplApiService, FplManager } from './fpl-api.service';
import { FplAuthService } from './fpl-auth.service';

const manager: FplManager = {
  id: 1234567,
  player_first_name: 'John',
  player_last_name: 'Smith',
  name: 'Example FC',
  summary_overall_points: 100,
  summary_overall_rank: 200,
  summary_event_points: 50,
  current_event: 8,
};

describe('FplAuthService', () => {
  let service: FplAuthService;
  let api: { getManager: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getManager: vi.fn(() => of(manager)) };
    TestBed.configureTestingModule({
      providers: [FplAuthService, { provide: FplApiService, useValue: api }],
    });
    service = TestBed.inject(FplAuthService);
  });

  it('starts in the not-connected state', () => {
    expect(service.getConnectionStatus()).toBe('not-connected');
  });


  it('connects public manager data', () => {
    service.connectManager(manager.id).subscribe();
    expect(api.getManager).toHaveBeenCalledWith(manager.id);
    expect(service.manager()).toEqual(manager);
    expect(service.getConnectionStatus()).toBe('connected');
  });

  it('clears the connection on logout', () => {
    service.connectManager(manager.id).subscribe();
    service.logout();
    expect(service.manager()).toBeNull();
    expect(service.getConnectionStatus()).toBe('not-connected');
  });

  it('leaves the connection untrusted when the public lookup fails', () => {
    api.getManager.mockReturnValue(throwError(() => new Error('CORS')));
    service.connectManager(manager.id).subscribe({ error: () => undefined });
    expect(service.manager()).toBeNull();
    expect(service.getConnectionStatus()).toBe('failed');
  });
});