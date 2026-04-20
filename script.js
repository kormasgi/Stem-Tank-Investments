import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vviuhvwxfaihpwnfdcgx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2aXVodnd4ZmFpaHB3bmZkY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTI5NjksImV4cCI6MjA5MjEyODk2OX0.PfBROkhmEfziSzUm4kfCknQPtSCPkDZ7s8Y48yC9xdU"
);

let currentUser = null;

async function login() {
  let code = document.getElementById("codeInput").value;

  let { data } = await supabase
    .from("users")
    .select("*")
    .eq("code", code);

  if (!data || data.length === 0) {
    document.getElementById("loginError").innerText = "Invalid code";
    return;
  }

  currentUser = data[0];

  updateBalance();

  // hide login screen
  document.getElementById("loginScreen").style.display = "none";
}

async function invest(group, amount) {

  if (!currentUser) return;
  if (currentUser.balance < amount) {
    document.getElementById("error").innerText = "Not enough money!";
    return;
  }

  document.getElementById("error").innerText = "";

  let newBalance = currentUser.balance - amount;

  await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("code", currentUser.code);

  await supabase.from("investments").insert([
    {
      group_name: group,
      amount: amount,
      user: currentUser.code
    }
  ]);

  currentUser.balance = newBalance;
  updateBalance();
}

window.invest = invest;

function updateBalance() {
  if (currentUser) {
    document.getElementById("balance").innerText = currentUser.balance;
  }
}

updateBalance()

supabase
  .channel('realtime investments')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'investments' },
    () => {
      updateLeaderboard();
    }
  )
  .subscribe();

async function updateLeaderboard() {
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

  let sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  let html = "";

  sorted.forEach(([group, total], index) => {
    html += `<div>
      ${index + 1}. ${group} — $${total.toLocaleString()}
    </div>`;
  });

  document.getElementById("leaderboard").innerHTML = html;
}

updateLeaderboard();