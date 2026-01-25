#!/usr/bin/env ts-node

/**
 * Script pour déployer un contrat BettingMatch pour le match mock (PSG vs Inter Milan)
 * et enregistrer l'adresse du contrat en base de données
 * 
 * Usage: ts-node scripts/deploy-mock-match.ts
 */

import { config } from 'dotenv';
import { supabase } from '../config/supabase';
import { bettingDeploymentService } from '../services/betting-match-deployment.service';

// Charger les variables d'environnement
config();

const MOCK_MATCH_ID = 1;
const MOCK_MATCH_DATA = {
    api_football_id: 1,
    home_team: 'PSG',
    away_team: 'Inter Milan',
    home_score: 0,
    away_score: 0,
    match_date: '2025-06-01T20:00:00Z',
    status: 'Not Started',
    league: 'Champions League',
    season: '2024/2025',
    venue: 'Wembley Stadium, London',
    referee: 'Anthony Taylor',
    odds: {
        match_winner: {
            home: 2.10,
            draw: 3.20,
            away: 3.50
        }
    }
};

async function deployMockMatchContract() {
    try {
        console.log('🚀 Démarrage du déploiement du contrat pour le match mock...\n');

        // 1. Vérifier si le match existe en base (sans betting_contract_address pour éviter l'erreur si la colonne n'existe pas)
        console.log(`📋 Vérification du match avec api_football_id = ${MOCK_MATCH_ID}...`);
        let existingMatch: any = null;
        let hasContractAddress = false;
        
        try {
            const { data, error: selectError } = await supabase
                .from('matches')
                .select('api_football_id, home_team, away_team, betting_contract_address')
                .eq('api_football_id', MOCK_MATCH_ID)
                .single();

            if (selectError && selectError.code !== 'PGRST116') {
                // Si l'erreur est liée à la colonne betting_contract_address, on réessaye sans
                if (selectError.message.includes('betting_contract_address')) {
                    console.log('⚠️  La colonne betting_contract_address n\'existe pas encore, on continue sans...');
                    const { data: dataWithoutContract, error: selectError2 } = await supabase
                        .from('matches')
                        .select('api_football_id, home_team, away_team')
                        .eq('api_football_id', MOCK_MATCH_ID)
                        .single();
                    
                    if (selectError2 && selectError2.code !== 'PGRST116') {
                        throw new Error(`Erreur lors de la récupération du match: ${selectError2.message}`);
                    }
                    existingMatch = dataWithoutContract;
                } else {
                    throw new Error(`Erreur lors de la récupération du match: ${selectError.message}`);
                }
            } else {
                existingMatch = data;
                hasContractAddress = !!data?.betting_contract_address;
            }
        } catch (error: any) {
            if (error.message.includes('betting_contract_address')) {
                // Réessayer sans la colonne
                const { data, error: selectError2 } = await supabase
                    .from('matches')
                    .select('api_football_id, home_team, away_team')
                    .eq('api_football_id', MOCK_MATCH_ID)
                    .single();
                
                if (selectError2 && selectError2.code !== 'PGRST116') {
                    throw new Error(`Erreur lors de la récupération du match: ${selectError2.message}`);
                }
                existingMatch = data;
            } else {
                throw error;
            }
        }

        // 2. Créer le match s'il n'existe pas
        let matchId = MOCK_MATCH_ID;
        if (!existingMatch) {
            console.log('📝 Le match n\'existe pas, création en cours...');
            const { data: newMatch, error: insertError } = await supabase
                .from('matches')
                .insert(MOCK_MATCH_DATA)
                .select('api_football_id')
                .single();

            if (insertError) {
                throw new Error(`Erreur lors de la création du match: ${insertError.message}`);
            }

            console.log(`✅ Match créé avec succès (api_football_id: ${newMatch.api_football_id})`);
        } else {
            console.log(`✅ Match trouvé: ${existingMatch.home_team} vs ${existingMatch.away_team}`);
            
            // Vérifier si un contrat existe déjà (seulement si la colonne existe)
            if (hasContractAddress && existingMatch.betting_contract_address) {
                console.log(`⚠️  Un contrat existe déjà pour ce match: ${existingMatch.betting_contract_address}`);
                console.log('⏭️  Skip du déploiement car un contrat existe déjà.');
                return;
            }
        }

        // 3. Déployer le contrat BettingMatch
        console.log('\n🎲 Déploiement du contrat BettingMatch...');
        const matchName = `${MOCK_MATCH_DATA.home_team} vs ${MOCK_MATCH_DATA.away_team}`;
        const ownerAddress = bettingDeploymentService.getAdminAddress();
        
        console.log(`   Match: ${matchName}`);
        console.log(`   Owner: ${ownerAddress}`);
        
        let contractAddress: string | null = null;
        try {
            contractAddress = await bettingDeploymentService.deployFootballMatch(
                matchName,
                ownerAddress
            );
            console.log(`\n✅ Contrat déployé avec succès à l'adresse: ${contractAddress}`);
        } catch (error: any) {
            console.error('\n⚠️  Erreur lors du déploiement du contrat:', error.message);
            
            // Vérifier si c'est une erreur de compatibilité réseau
            if (error.message?.includes('MCOPY') || error.message?.includes('invalid opcode')) {
                console.log('\n💡 Le contrat Factory utilise des opcodes non supportés par le réseau Chiliz Spicy Testnet.');
                console.log('   Le contrat a probablement été compilé avec evmVersion: "cancun" qui n\'est pas encore supporté.');
                console.log('   Le match sera créé en base de données sans adresse de contrat pour le moment.');
                console.log('   Pour résoudre ce problème, il faut recompiler les contrats avec une version EVM compatible (paris ou london).');
            } else {
                throw error; // Re-lancer l'erreur si ce n'est pas une erreur de compatibilité
            }
        }

        // 4. Mettre à jour le match en base avec l'adresse du contrat
        console.log('\n💾 Mise à jour du match en base de données...');
        
        // Essayer de mettre à jour avec betting_contract_address
        const updateData: any = {
            updated_at: new Date().toISOString()
        };
        
        // Essayer d'ajouter betting_contract_address si la colonne existe
        try {
            updateData.betting_contract_address = contractAddress;
            const { error: updateError } = await supabase
                .from('matches')
                .update(updateData)
                .eq('api_football_id', MOCK_MATCH_ID);

            if (updateError) {
                // Si l'erreur est liée à la colonne betting_contract_address, on continue quand même
                if (updateError.message.includes('betting_contract_address')) {
                    console.log('⚠️  La colonne betting_contract_address n\'existe pas encore dans la base.');
                    console.log('💡 Veuillez exécuter la migration SQL pour ajouter cette colonne:');
                    console.log('   ALTER TABLE matches ADD COLUMN IF NOT EXISTS betting_contract_address TEXT;');
                    console.log(`📝 Adresse du contrat déployé: ${contractAddress}`);
                    console.log('   Vous pouvez mettre à jour manuellement le match après avoir ajouté la colonne.');
                } else {
                    throw new Error(`Erreur lors de la mise à jour du match: ${updateError.message}`);
                }
            } else {
                console.log('✅ Match mis à jour avec succès en base de données');
            }
        } catch (error: any) {
            if (error.message.includes('betting_contract_address')) {
                console.log('⚠️  Impossible de mettre à jour betting_contract_address (colonne inexistante)');
                console.log(`📝 Adresse du contrat déployé: ${contractAddress}`);
            } else {
                throw error;
            }
        }
        
        // 5. Afficher le résumé
        console.log('\n📊 Résumé:');
        console.log(`   Match ID: ${MOCK_MATCH_ID}`);
        console.log(`   Match: ${matchName}`);
        console.log(`   Contrat: ${contractAddress}`);
        console.log(`   Owner: ${ownerAddress}`);
        console.log('\n✅ Déploiement terminé avec succès !');

    } catch (error: any) {
        console.error('\n❌ Erreur lors du déploiement:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Exécuter le script
if (require.main === module) {
    deployMockMatchContract()
        .then(() => {
            console.log('\n✨ Script terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Erreur fatale:', error);
            process.exit(1);
        });
}

export { deployMockMatchContract };
