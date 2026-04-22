import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vviuhvwxfaihpwnfdcgx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2aXVodnd4ZmFpaHB3bmZkY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTI5NjksImV4cCI6MjA5MjEyODk2OX0.PfBROkhmEfziSzUm4kfCknQPtSCPkDZ7s8Y48yC9xdU"
);

let currentUser = null;
let selectedGroup = null;

function selectGroup(group) {
  selectedGroup = group;

  document.getElementById("groupScreen").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
}

window.selectGroup = selectGroup;

async function login() {
  const code = document.getElementById("codeInput").value;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("code", code);

  if (!data || data.length === 0) {
    document.getElementById("loginError").innerText = "Invalid code";
    return;
  }

  currentUser = data[0];

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("currentGroup").innerText =
    "Investing in Group " + selectedGroup;

  updateBalance();
  updateLeaderboard();
}

window.login = login;

async function invest(amount) {
  if (!currentUser) return;

  if (currentUser.balance < amount) {
    document.getElementById("error").innerText = "Not enough money!";
    return;
  }

  document.getElementById("error").innerText = "";

  const newBalance = currentUser.balance - amount;

  await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("code", currentUser.code);

  let { data: groupData } = await supabase
    .from("groups")
    .select("*")
    .eq("name", selectedGroup);

  let groupRow = groupData[0];
  let newGroupBalance = groupRow.balance + amount;

  await supabase
    .from("groups")
    .update({ balance: newGroupBalance })
    .eq("id", groupRow.id);

  await supabase.from("investments").insert([
    {
      group_name: selectedGroup,
      amount: amount,
      user: currentUser.code
    }
  ]);

  currentUser.balance = newBalance;

  updateBalance();
}

window.invest = invest;

function updateBalance() {
  document.getElementById("balance").innerText =
    currentUser.balance.toLocaleString();
}

supabase
  .channel("groups")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "groups" },
    updateLeaderboard
  )
  .subscribe();

async function updateLeaderboard() {
  const { data } = await supabase.from("groups").select("*");

  let sorted = data.sort((a, b) => b.balance - a.balance);

  let html = "";
  sorted.forEach((g, i) => {
    html += `${i + 1}. Group ${g.name} — $${g.balance.toLocaleString()}<br>`;
  });

  document.getElementById("leaderboard").innerHTML = html;
}