import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import type { LeagueTableRow } from '../components/dashboard/dashboard';
import { FplLeague } from './fpl-api.service';

const ENTRY_FEE = 5;
const STARTING_BALANCE = 0;

export interface BalanceSheetRow {
  manager: string;
  isCurrentWinner: boolean;
  wins: number;
  previousBalance: number;
  currentBalance: number;
  winningBalance: number;
  totalBalance: number;
}

export interface BalanceSheet {
  presentWeek: number;
  reservedBalance: number;
  rows: BalanceSheetRow[];
}

@Injectable({ providedIn: 'root' })
export class FplLeagueExportService {
  createBalanceSheet(
    rows: LeagueTableRow[],
    currentEvent: number
  ): BalanceSheet | null {
    if (!rows.length) return null;

    const availableWeeks = Array.from(
      { length: 38 },
      (_, index) => index + 1
    ).filter((week) =>
      rows.some((row) => row.weeklyPoints[week] !== undefined)
    );

    const presentWeek = currentEvent || availableWeeks.at(-1) || 1;
    const playedWeeks = availableWeeks.filter(
      (week) => week <= presentWeek
    );
    const previousWeeks = playedWeeks.filter(
      (week) => week < presentWeek
    );

    const wins = new Map<number, number>();
    const previousBalances = new Map<number, number>();

    rows.forEach((row) => {
      wins.set(row.entry, 0);
      previousBalances.set(row.entry, STARTING_BALANCE);
    });

    for (const week of previousWeeks) {
      const winner = this.findWinner(rows, week);

      rows.forEach((row) =>
        previousBalances.set(
          row.entry,
          previousBalances.get(row.entry)! - ENTRY_FEE
        )
      );

      if (winner) {
        const winningAmount = rows.length * ENTRY_FEE - ENTRY_FEE;

        previousBalances.set(
          winner.entry,
          previousBalances.get(winner.entry)! + winningAmount
        );

        wins.set(
          winner.entry,
          wins.get(winner.entry)! + 1
        );
      }
    }

    const currentWinner = this.findWinner(rows, presentWeek);
    const currentWinningAmount = currentWinner
      ? rows.length * ENTRY_FEE - ENTRY_FEE
      : 0;

    if (currentWinner) {
      wins.set(
        currentWinner.entry,
        wins.get(currentWinner.entry)! + 1
      );
    }

    return {
      presentWeek,
      reservedBalance: playedWeeks.length * ENTRY_FEE,

      rows: rows.map((row) => {
        const currentBalance = -ENTRY_FEE;

        const winningBalance =
          currentWinner?.entry === row.entry
            ? currentWinningAmount
            : 0;

        const previousBalance =
          previousBalances.get(row.entry)!;

        return {
          manager: row.player_name,
          isCurrentWinner:
            currentWinner?.entry === row.entry,
          wins: wins.get(row.entry)!,
          previousBalance,
          currentBalance,
          winningBalance,
          totalBalance:
            previousBalance +
            currentBalance +
            winningBalance,
        };
      }),
    };
  }

  exportLeague(
    league: FplLeague,
    rows: LeagueTableRow[],
    currentEvent: number
  ): void {
    const balanceSheet = this.createBalanceSheet(
      rows,
      currentEvent
    );

    if (!balanceSheet) return;

    const headers = [
      'Manager',
      'How many times won?',
      'Previous Balance',
      `Game Week-${balanceSheet.presentWeek} Balance`,
      'Winning Balance',
      'Total Balance',
    ];

    const data = [
      [`${league.name} | FPL balance sheet`],
      ['Entry fee per gameweek: $5'],
      [`Current gameweek: ${balanceSheet.presentWeek}`],
      ['Reserved amount per gameweek: $5'],
      [],
      headers,

      ...balanceSheet.rows.map((row) => [
        row.manager,
        row.wins,
        row.previousBalance,
        row.currentBalance,
        row.winningBalance,
        row.totalBalance,
      ]),

      [],

      [
        'Reserved Balance',
        '',
        '',
        '',
        balanceSheet.reservedBalance,
        balanceSheet.reservedBalance,
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    worksheet['!freeze'] = {
      xSplit: 1,
      ySplit: 6,
    };

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 23 },
      { wch: 18 },
      { wch: 15 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      this.sheetName(league.name)
    );

    XLSX.writeFile(
      workbook,
      `${this.fileName(league.name)}-gameweek-${balanceSheet.presentWeek}-balances.xlsx`
    );
  }

  private findWinner(
    rows: LeagueTableRow[],
    week: number
  ): LeagueTableRow | null {
    const scoredRows = rows.filter(
      (row) => row.weeklyPoints[week] !== undefined
    );

    if (!scoredRows.length) return null;

    return [...scoredRows].sort((left, right) => {
      const pointsDifference =
        (right.weeklyPoints[week] ?? 0) -
        (left.weeklyPoints[week] ?? 0);

      return pointsDifference || left.rank - right.rank;
    })[0];
  }

  private sheetName(name: string): string {
    return (
      name
        .replace(/[\\/?*:[\]]/g, '')
        .slice(0, 31) || 'League'
    );
  }

  private fileName(name: string): string {
    return (
      name
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'fpl-league'
    );
  }
}