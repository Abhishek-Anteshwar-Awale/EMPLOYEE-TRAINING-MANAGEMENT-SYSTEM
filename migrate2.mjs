import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://raozwxavlpgvzjxkrjit.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhb3p3eGF2bHBndnpqeGtyaml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzQ0NDQsImV4cCI6MjEwMzkxMDQ0NH0.LMA94JRY_gunxlyoJw9zXmUXUGdNvID6ZR73LqskBJg';

const NEW_URL = 'https://opgijbnaesvrthluxqqn.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZ2lqYm5hZXN2cnRobHV4cXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzgzNTMsImV4cCI6MjEwNTE1NDM1M30.NrzlCzUYszYje7SIhIR0eQplEt9eDSY8-BntHzlC5x4';

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

const TABLES = [
  'employees',
  'trainings',
  'employee_groups',
  'employee_group_members',
  'training_schedules',
  'attendance_records'
];

async function migrate() {
  console.log('Starting data migration...');

  for (const table of TABLES) {
    console.log('\nFetching data from ' + table + '...');
    
    const { data: rows, error: fetchError } = await oldDb.from(table).select('*');

    if (fetchError) {
      console.error('Error fetching ' + table + ':', fetchError.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log('No data found in ' + table + ', skipping.');
      continue;
    }

    console.log('Found ' + rows.length + ' rows in ' + table + '. Inserting into new DB...');

    let rowsToInsert = rows;
    if (table === 'employees') {
      rowsToInsert = rows.map(r => ({
        id: r.id,
        employee_code: r.employee_code,
        name: r.name,
        email: r.email,
        phone: r.phone,
        department: r.department,
        role: r.role,
        joining_date: r.joining_date,
        status: r.status,
        created_at: r.created_at
      }));
    }

    const { error: insertError } = await newDb.from(table).insert(rowsToInsert);

    if (insertError) {
      console.error('Error inserting into ' + table + ':', insertError.message);
    } else {
      console.log('Successfully migrated ' + table + '!');
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
