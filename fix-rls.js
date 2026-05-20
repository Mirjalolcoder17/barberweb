const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vezdgqyndfdafwcdrgfz.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemRncXluZGZkYWZ3Y2RyZ2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkwODAyNiwiZXhwIjoyMDkzNDg0MDI2fQ.lfl41wMlXsUM5QoBKLT3O7W9M-M6LW3ps2yt0K8cmpw';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixRLS() {
  console.log('🔧 Supabase RLS ni tekshirish...\n');

  // Check current barbers
  const { data: barbers } = await sb.from('barbers').select('*');
  console.log('📋 Hozirgi masterlar:', barbers?.length || 0);

  // Test insert with service role
  console.log('\n📝 Test insert...');
  const testId = '00000000-0000-0000-0000-000000000001';
  try {
    await sb.from('barbers').delete().eq('id', testId);
  } catch(e) {}

  const { error: insertError } = await sb.from('barbers').insert({
    id: testId,
    name: 'Test Master',
    role: 'Barber'
  });

  if (insertError) {
    console.log('❌ Insert xatolik:', insertError.message);
  } else {
    console.log('✅ Insert muvaffaqiyatli');
  }

  // Test update
  console.log('\n✏️ Test update...');
  const { error: updateError } = await sb.from('barbers').update({ name: 'Test Updated' }).eq('id', testId);
  if (updateError) {
    console.log('❌ Update xatolik:', updateError.message);
  } else {
    console.log('✅ Update muvaffaqiyatli');
  }

  // Test delete
  console.log('\n🗑️ Test delete...');
  const { error: deleteError } = await sb.from('barbers').delete().eq('id', testId);
  if (deleteError) {
    console.log('❌ Delete xatolik:', deleteError.message);
  } else {
    console.log('✅ Delete muvaffaqiyatli');
  }

  console.log('\n✅ RLS tekshirish yakunlandi');
}

fixRLS().catch(console.error);