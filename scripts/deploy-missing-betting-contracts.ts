#!/usr/bin/env ts-node

/**
 * Script to deploy BettingMatch contracts for matches in the database
 * that don't have a contract address yet (betting_contract_address null or empty).
 *
 * Usage: ts-node scripts/deploy-missing-betting-contracts.ts
 * or: npm run deploy:missing-contracts
 */

import { config } from 'dotenv';
import { supabase } from '../config/supabase';
import {
  bettingDeploymentService,
  MarketSetupOdds,
} from '../services/betting-match-deployment.service';
import { ExtendedOdds } from '../models/ApiFootball.model';

config();

interface MatchWithoutContract {
  api_football_id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  odds?: ExtendedOdds | null;
}

async function deployMissingBettingContracts() {
  try {
    console.log('🚀 Searching for matches without betting contract...\n');

    // 1. Fetch all matches and filter those without betting_contract_address
    const { data: matches, error: selectError } = await supabase
      .from('matches')
      .select('api_football_id, home_team, away_team, match_date, betting_contract_address, odds');

    if (selectError) {
      throw new Error(`Error fetching matches: ${selectError.message}`);
    }

    const matchesToDeploy = (matches || []).filter(
      (m: any) => !m.betting_contract_address || String(m.betting_contract_address).trim() === ''
    ) as MatchWithoutContract[];

    if (matchesToDeploy.length === 0) {
      console.log('✅ No matches without contract found. All matches already have a contract address.');
      return;
    }

    console.log(`📋 ${matchesToDeploy.length} match(es) without contract found:\n`);

    const ownerAddress = bettingDeploymentService.getAdminAddress();
    let deployedCount = 0;
    let failedCount = 0;

    for (const match of matchesToDeploy) {
      const matchName = `${match.home_team} vs ${match.away_team}`;
      console.log(`\n🎲 [${match.api_football_id}] ${matchName}`);

      try {
        const contractAddress = await bettingDeploymentService.deployFootballMatch(
          matchName,
          ownerAddress
        );

        // Create markets (WINNER, GOALS_TOTAL, BOTH_SCORE) and open them
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

        await bettingDeploymentService.setupDefaultMarkets(contractAddress, odds);

        const { error: updateError } = await supabase
          .from('matches')
          .update({ betting_contract_address: contractAddress })
          .eq('api_football_id', match.api_football_id);

        if (updateError) {
          console.error(`   ❌ DB update error: ${updateError.message}`);
          console.log(`   📝 Deployed address (update manually): ${contractAddress}`);
          failedCount++;
        } else {
          console.log(`   ✅ Contract deployed and saved: ${contractAddress}`);
          deployedCount++;
        }

        // Pause between deployments to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`   ❌ Deployment error: ${error.message}`);
        failedCount++;

        if (error.message?.includes('MCOPY') || error.message?.includes('invalid opcode')) {
          console.log('   💡 Network may not support contract opcodes (evmVersion cancun).');
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Deployed successfully: ${deployedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Total processed: ${matchesToDeploy.length}`);
    console.log('\n✅ Script completed.');
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  deployMissingBettingContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

export { deployMissingBettingContracts };
