#!/usr/bin/env ts-node

/**
 * Script to configure betting markets on FootballMatch contracts
 * that already have an address but no markets yet (marketCount = 0).
 *
 * Usage: ts-node scripts/setup-markets-for-existing-contracts.ts
 * or: npm run setup:markets
 */

import { config } from 'dotenv';
import { supabase } from '../config/supabase';
import {
  bettingDeploymentService,
  MarketSetupOdds,
} from '../services/betting-match-deployment.service';
import { ExtendedOdds } from '../models/ApiFootball.model';

config();

interface MatchWithContract {
  api_football_id: number;
  home_team: string;
  away_team: string;
  betting_contract_address: string;
  odds?: ExtendedOdds | null;
}

async function setupMarketsForExistingContracts() {
  try {
    console.log('🚀 Searching for contracts without markets...\n');

    const { data: matches, error: selectError } = await supabase
      .from('matches')
      .select('api_football_id, home_team, away_team, betting_contract_address, odds')
      .not('betting_contract_address', 'is', null);

    if (selectError) {
      throw new Error(`Error fetching matches: ${selectError.message}`);
    }

    const matchesWithContract = (matches || []).filter(
      (m: any) => m.betting_contract_address && String(m.betting_contract_address).trim() !== ''
    ) as MatchWithContract[];

    if (matchesWithContract.length === 0) {
      console.log('✅ No matches with contract found.');
      return;
    }

    let setupCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const match of matchesWithContract) {
      const matchName = `${match.home_team} vs ${match.away_team}`;
      console.log(`\n🎲 [${match.api_football_id}] ${matchName} @ ${match.betting_contract_address}`);

      try {
        const count = await bettingDeploymentService.getMarketCount(match.betting_contract_address);
        if (count > 0) {
          // Markets exist but may not be opened (e.g. partial setup) - open any Inactive ones
          const opened = await bettingDeploymentService.openInactiveMarkets(match.betting_contract_address);
          if (opened > 0) {
            console.log(`   ✅ Opened ${opened} market(s) that were Inactive.`);
            setupCount++;
          } else {
            console.log(`   ⏭️  ${count} market(s) already configured and open, skip.`);
            skippedCount++;
          }
          continue;
        }

        const odds: MarketSetupOdds | undefined = (match as any).odds?.match_winner
          ? {
              homeWin: (match as any).odds.match_winner.home,
              draw: (match as any).odds.match_winner.draw,
              awayWin: (match as any).odds.match_winner.away,
              over25: (match as any).odds.over_under?.over_2_5,
              under25: (match as any).odds.over_under?.under_2_5,
              bttsYes: (match as any).odds.both_teams_score?.yes,
              bttsNo: (match as any).odds.both_teams_score?.no,
            }
          : undefined;

        await bettingDeploymentService.setupDefaultMarkets(match.betting_contract_address, odds);
        setupCount++;

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Markets configured: ${setupCount}`);
    console.log(`   Already configured (skip): ${skippedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log('\n✅ Script completed.');
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupMarketsForExistingContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

export { setupMarketsForExistingContracts };
