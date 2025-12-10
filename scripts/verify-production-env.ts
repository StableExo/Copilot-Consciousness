#!/usr/bin/env node
/**
 * Verify Production Environment in Supabase
 * 
 * Quick script to verify the production environment was saved correctly.
 */

import { config } from 'dotenv';
import { getSupabaseClient } from '../src/infrastructure/supabase/client.js';

config();

async function verifyProductionEnv() {
  console.log('Verifying production environment in Supabase...\n');

  const supabase = getSupabaseClient(true);

  const { data, error } = await supabase
    .from('environment_configs')
    .select('*')
    .eq('environment', 'production')
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Production environment found!');
  console.log('ID:', data.id);
  console.log('Version:', data.version);
  console.log('Network:', data.network);
  console.log('Chain ID:', data.chain_id);
  console.log('Deployed:', data.deployed);
  console.log('Created at:', data.created_at);
  console.log('Created by:', data.created_by);
  console.log('Description:', data.description);
  console.log('\nConfig keys:', Object.keys(data.config_data).length);
  console.log('Sample config keys:', Object.keys(data.config_data).slice(0, 10).join(', '), '...\n');

  process.exit(0);
}

verifyProductionEnv();
