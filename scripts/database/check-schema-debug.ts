#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchema() {
  console.log('Checking environment_configs columns...\n');
  
  // Try to select all columns
  const { data, error } = await supabase
    .from('environment_configs')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error selecting *:', error.message);
    console.log('\nTrying with just id...');
    
    const { data: idData, error: idError } = await supabase
      .from('environment_configs')
      .select('id')
      .limit(1);
      
    if (idError) {
      console.error('Even id failed:', idError.message);
    } else {
      console.log('✅ id column exists');
      console.log('   Rows:', idData?.length || 0);
    }
  } else {
    console.log('✅ Table accessible with *');
    if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table is empty - cannot determine columns from data');
      console.log('But table exists and is accessible');
    }
  }
}

checkSchema();
