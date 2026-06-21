const { Client } = require('pg');

const sql = `
-- Add membership_status to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'none';

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id text PRIMARY KEY,
  user_name text NOT NULL,
  is_sabotaged boolean DEFAULT false,
  last_active timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL,
  text text NOT NULL,
  timestamp timestamp with time zone DEFAULT now()
);

-- RLS policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to chat_sessions" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "Allow service role full access to chat_messages" ON chat_messages FOR ALL USING (true);

-- Also ensure public can insert/select based on the fact we use service_role
CREATE POLICY "Allow public read/write to chat_sessions" ON chat_sessions FOR ALL TO public USING (true);
CREATE POLICY "Allow public read/write to chat_messages" ON chat_messages FOR ALL TO public USING (true);
`;

const client = new Client({
  connectionString: 'postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabubnan*98@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

client.connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log("Migration successful");
    client.end();
  })
  .catch(err => {
    console.error("Migration failed:", err);
    client.end();
  });
