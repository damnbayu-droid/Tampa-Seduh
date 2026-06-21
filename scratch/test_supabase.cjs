const { createClient } = require('@supabase/supabase-js');
const url = 'https://yizsanjcyphlbtjcwzxl.supabase.co';
const key = 'sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('menu').insert([{
    id: "test-m-" + Date.now(),
    name: "Test Menu",
    price_reg: 10,
    is_hot: true,
    is_available: true
  }]);
  console.log("Insert Menu:", { data, error });
}
test();
