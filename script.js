import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vviuhvwxfaihpwnfdcgx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2aXVodnd4ZmFpaHB3bmZkY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTI5NjksImV4cCI6MjA5MjEyODk2OX0.PfBROkhmEfziSzUm4kfCknQPtSCPkDZ7s8Y48yC9xdU"
);

let currentUser = null;

async function login() {
  let code = prompt("Enter your code:");

  let { data } = await supabase
    .from("users")
    .select("*")
    .eq("code", code);

  if (data.length === 0) {
    alert("Invalid code");
    return;
  }

  currentUser = data[0];
  alert("Welcome " + currentUser.name);
}

login();

async function invest(group) {
  if (!currentUser) return;

  if (currentUser.balance <= 0) {
    alert("No money left!");
    return;
  }

  let newBalance = currentUser.balance - 1;

  await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("code", currentUser.code);

  await supabase.from("investments").insert([
    { 
      group_name: group,
      amount: 1,
      user: currentUser.code
    }
  ]);

  currentUser.balance = newBalance;
  updateBalance();
}

function updateBalance() {
  if (currentUser) {
    document.getElementById("balance").innerText = currentUser.balance;
  }
}

window.invest = invest;

supabase
  .channel('realtime investments')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'investments' },
    () => {
      updateTotal();
    }
  )
  .subscribe();

async function updateTotal() {
  let { data } = await supabase
    .from("investments")
    .select("*");

  let totals = {};

  data.forEach(row => {
    if (!totals[row.group_name]) {
      totals[row.group_name] = 0;
    }
    totals[row.group_name] += row.amount;
  });

  let text = "";
  for (let group in totals) {
    text += group + ": " + totals[group] + "<br>";
  }

  document.getElementById("total").innerHTML = text;
}

updateTotal();