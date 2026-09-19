import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'home' },
	{ path: 'home', component: DashboardComponent, title: 'FPL Central | League room' },
	{ path: 'manager/:managerId', component: DashboardComponent, title: 'FPL Central | Manager view' },
	{ path: 'login', component: LoginComponent, title: 'FPL Central | Connect account' },
	{ path: '**', redirectTo: 'home' },
];
