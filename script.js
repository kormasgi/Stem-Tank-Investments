import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vviuhvwxfaihpwnfdcgx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2aXVodnd4ZmFpaHB3bmZkY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTI5NjksImV4cCI6MjA5MjEyODk2OX0.PfBROkhmEfziSzUm4kfCknQPtSCPkDZ7s8Y48yC9xdU"
);

let currentUser = null;

async function login() {
  const code = document.getElementById("codeInput").value;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("code", code);

  if (error || !data || data.length === 0) {
    document.getElementById("loginError").innerText = "Invalid code";
    return;
  }

  currentUser = data[0];

  updateBalance();

  document.getElementById("loginScreen").style.display = "none";
}

window.login = login;

async function invest(group, amount) {
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

  const groupName = group.replace("Group ", "").trim();

  let { data: groupData, error } = await supabase
    .from("groups")
    .select("*")
    .eq("name", groupName);

  if (error || !groupData || groupData.length === 0) {
    console.log("Group not found:", groupName);
    document.getElementById("error").innerText = "Group error";
    return;
  }

  let groupRow = groupData[0];

  let newGroupBalance = groupRow.balance + amount;

  await supabase
    .from("groups")
    .update({ balance: newGroupBalance })
    .eq("id", groupRow.id);

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
    document.getElementById("balance").innerText =
      currentUser.balance.toLocaleString();
  }
}

supabase
  .channel("realtime groups")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "groups" },
    () => {
      updateLeaderboard();
    }
  )
  .subscribe();

async function updateLeaderboard() {
  const { data } = await supabase
    .from("groups")
    .select("*");
    
  let sorted = data.sort((a, b) => b.balance - a.balance);

  let html = "";

  sorted.forEach((group, index) => {
    html += `<div>
      ${index + 1}. Group ${group.name} — $${group.balance.toLocaleString()}
    </div>`;
  });

  document.getElementById("leaderboard").innerHTML = html;
}
updateLeaderboard();