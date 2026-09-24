import { createClient } from '@supabase/supabase-js';
const OLD_URL = 'https://raozwxavlpgvzjxkrjit.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhb3p3eGF2bHBndnpqeGtyaml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzQ0NDQsImV4cCI6MjEwMzkxMDQ0NH0.LMA94JRY_gunxlyoJw9zXmUXUGdNvID6ZR73LqskBJg';

const oldDb = createClient(OLD_URL, OLD_KEY);

async function extract() {
  const { data } = await oldDb.from('employees').select('*');
  let sql = 'INSERT INTO public.employees (id, employee_code, name, email, phone, department, role, joining_date, status, created_at) VALUES\n';
  
  const values = data.map(r => {
    const esc = (str) => str === null || str === undefined ? 'NULL' : "'" + String(str).replace(/'/g, "''") + "'";
    return `(${esc(r.id)}, ${esc(r.employee_code)}, ${esc(r.name)}, ${esc(r.email)}, ${esc(r.phone)}, ${esc(r.department)}, ${esc(r.role)}, ${esc(r.joining_date)}, ${esc(r.status)}, ${esc(r.created_at)})`;
  });
  
  sql += values.join(',\n') + ';';
  console.log(sql);
}

extract();
