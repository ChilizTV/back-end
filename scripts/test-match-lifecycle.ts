#!/usr/bin/env ts-node

/**
 * Script to test match lifecycle and crons (sync, resolution).
 * Interactive menu: run with no args to show the menu and type the option number.
 *
 * Usage:
 *   npx ts-node scripts/test-match-lifecycle.ts          # Interactive menu
 *   npx ts-node scripts/test-match-lifecycle.ts create    # CLI (create / live / finished / status)
 */

import * as readline from 'readline';
import { config } from 'dotenv';
import { supabase } from '../config/supabase';
import {
    bettingDeploymentService,
    type MarketSetupOdds,
} from '../services/betting-match-deployment.service';
import type { ExtendedOdds } from '../models/ApiFootball.model';

config();

const TEST_MATCH_ID = 999001;
const DEFAULT_ODDS: ExtendedOdds = {
    match_winner: { home: 2.1, draw: 3.2, away: 3.5 },
    over_under: {
        over_0_5: 1.1, over_1_5: 1.4, over_2_5: 1.85, over_3_5: 2.8, over_4_5: 5.0,
        under_0_5: 7.0, under_1_5: 3.0, under_2_5: 1.95, under_3_5: 1.35, under_4_5: 1.1,
    },
    both_teams_score: { yes: 1.7, no: 2.1 },
};

function getMatchId(): number {
    const id = process.argv[3];
    if (id !== undefined) {
        const n = parseInt(id, 10);
        if (!Number.isNaN(n)) return n;
    }
    return TEST_MATCH_ID;
}

function ask(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve((answer || '').trim());
        });
    });
}

function printMenu(): void {
    console.log('\n─────────────────────────────────────────');
    console.log('  TEST MATCH LIFECYCLE (id=' + TEST_MATCH_ID + ')');
    console.log('─────────────────────────────────────────');
    console.log('  1  - Create match + deploy contract (status: not started NS)');
    console.log('  2  - Set match to live (1H, score 0-0)');
    console.log('  3  - Finish match with score (FT)');
    console.log('  4  - Show match status');
    console.log('  q  - Quit');
    console.log('─────────────────────────────────────────');
}

async function createTestMatch(): Promise<void> {
    const matchDate = new Date();
    matchDate.setHours(matchDate.getHours() + 2);
    const match = {
        api_football_id: TEST_MATCH_ID,
        home_team: 'Test Team A',
        away_team: 'Test Team B',
        home_score: null as number | null,
        away_score: null as number | null,
        match_date: matchDate.toISOString(),
        status: 'NS',
        league: 'Test League',
        season: '2024/25',
        venue: 'Test Stadium',
        referee: null,
        odds: DEFAULT_ODDS,
        betting_contract_address: null as string | null,
    };

    const { error: insertError } = await supabase
        .from('matches')
        .upsert(match, { onConflict: 'api_football_id' });

    if (insertError) {
        throw new Error('Match insert error: ' + insertError.message);
    }

    const matchName = `${match.home_team} vs ${match.away_team}`;
    const ownerAddress = bettingDeploymentService.getAdminAddress();

    console.log('🎯 Deploying FootballMatch contract...');
    const contractAddress = await bettingDeploymentService.deployFootballMatch(matchName, ownerAddress);

    const odds: MarketSetupOdds = {
        homeWin: DEFAULT_ODDS.match_winner?.home,
        draw: DEFAULT_ODDS.match_winner?.draw,
        awayWin: DEFAULT_ODDS.match_winner?.away,
        over25: DEFAULT_ODDS.over_under?.over_2_5,
        under25: DEFAULT_ODDS.over_under?.under_2_5,
        bttsYes: DEFAULT_ODDS.both_teams_score?.yes,
        bttsNo: DEFAULT_ODDS.both_teams_score?.no,
    };
    await bettingDeploymentService.setupDefaultMarkets(contractAddress, odds);

    const { error: updateError } = await supabase
        .from('matches')
        .update({ betting_contract_address: contractAddress })
        .eq('api_football_id', TEST_MATCH_ID);

    if (updateError) {
        throw new Error('Contract address update error: ' + updateError.message);
    }

    console.log('\n✅ Test match created and contract deployed.');
    console.log(`   api_football_id: ${TEST_MATCH_ID}`);
    console.log(`   contract:        ${contractAddress}`);
}

async function setMatchLive(apiFootballId: number): Promise<void> {
    const { error } = await supabase
        .from('matches')
        .update({
            status: '1H',
            home_score: 0,
            away_score: 0,
        })
        .eq('api_football_id', apiFootballId);

    if (error) {
        throw new Error('Update error: ' + error.message);
    }
    console.log(`✅ Match ${apiFootballId} set to live (1H), score 0-0.`);
}

async function setMatchFinished(apiFootballId: number, homeScore: number, awayScore: number): Promise<void> {
    const { error } = await supabase
        .from('matches')
        .update({
            status: 'FT',
            home_score: homeScore,
            away_score: awayScore,
        })
        .eq('api_football_id', apiFootballId);

    if (error) {
        throw new Error('Update error: ' + error.message);
    }
    console.log(`✅ Match ${apiFootballId} set to finished (FT), score ${homeScore}-${awayScore}.`);
    console.log('   The sync-matches cron will resolve markets on-chain right after the next sync run.');
}

async function showStatus(apiFootballId: number): Promise<void> {
    const { data, error } = await supabase
        .from('matches')
        .select('api_football_id, home_team, away_team, status, home_score, away_score, betting_contract_address')
        .eq('api_football_id', apiFootballId)
        .single();

    if (error || !data) {
        throw new Error('Match not found or error: ' + (error?.message ?? 'not found'));
    }

    console.log('📋 Match:', data.home_team, 'vs', data.away_team);
    console.log('   api_football_id:', data.api_football_id);
    console.log('   status:         ', data.status);
    console.log('   score:          ', data.home_score ?? '-', '-', data.away_score ?? '-');
    console.log('   contract:       ', data.betting_contract_address ?? '(none)');
}

async function runMenu(): Promise<void> {
    for (;;) {
        printMenu();
        const choice = await ask('Your choice (1/2/3/4/q): ');

        if (choice === 'q' || choice === 'Q') {
            console.log('Goodbye.');
            return;
        }

        try {
            if (choice === '1') {
                await createTestMatch();
            } else if (choice === '2') {
                await setMatchLive(TEST_MATCH_ID);
            } else if (choice === '3') {
                const scoreInput = await ask('Score (e.g. 2 1 for 2-1): ');
                const parts = scoreInput.split(/\s+/);
                const h = parseInt(parts[0] ?? '0', 10);
                const a = parseInt(parts[1] ?? '0', 10);
                if (Number.isNaN(h) || Number.isNaN(a)) {
                    console.log('❌ Enter two numbers (e.g. 2 1).');
                } else {
                    await setMatchFinished(TEST_MATCH_ID, h, a);
                }
            } else if (choice === '4') {
                await showStatus(TEST_MATCH_ID);
            } else {
                console.log('Invalid choice. Type 1, 2, 3, 4 or q.');
            }
        } catch (err: any) {
            console.error('❌ Error:', err?.message ?? err);
        }
    }
}

async function main(): Promise<void> {
    const cmd = process.argv[2]?.toLowerCase();

    // No arg => interactive menu
    if (!cmd) {
        await runMenu();
        return;
    }

    // CLI (create / live / finished / status)
    if (cmd === 'create') {
        await createTestMatch();
        return;
    }
    if (cmd === 'live') {
        await setMatchLive(getMatchId());
        return;
    }
    if (cmd === 'finished') {
        const a3 = process.argv[3];
        const a4 = process.argv[4];
        const a5 = process.argv[5];
        let id: number;
        let h: number;
        let a: number;
        if (a5 !== undefined) {
            id = parseInt(a3!, 10);
            h = parseInt(a4!, 10);
            a = parseInt(a5, 10);
        } else if (a4 !== undefined) {
            id = TEST_MATCH_ID;
            h = parseInt(a3!, 10);
            a = parseInt(a4, 10);
        } else {
            console.error('Usage: finished [id] <home_score> <away_score>');
            process.exit(1);
        }
        if (Number.isNaN(id) || Number.isNaN(h) || Number.isNaN(a)) {
            console.error('Usage: finished [id] <home_score> <away_score>');
            process.exit(1);
        }
        await setMatchFinished(id, h, a);
        return;
    }
    if (cmd === 'status') {
        await showStatus(getMatchId());
        return;
    }

    console.log('Usage:');
    console.log('  npx ts-node scripts/test-match-lifecycle.ts           # Interactive menu');
    console.log('  npx ts-node scripts/test-match-lifecycle.ts create');
    console.log('  npx ts-node scripts/test-match-lifecycle.ts live [id]');
    console.log('  npx ts-node scripts/test-match-lifecycle.ts finished [id] <home> <away>');
    console.log('  npx ts-node scripts/test-match-lifecycle.ts status [id]');
    console.log('\n[id] default =', TEST_MATCH_ID);
    process.exit(1);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
