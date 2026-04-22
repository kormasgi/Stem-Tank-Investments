import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vviuhvwxfaihpwnfdcgx.supabase.co",
  "YOUR_ANON_KEY_HERE"
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

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("code", code);

  if (error || !data || data.length === 0) {
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

  let { data: existing } = await supabase
    .from("investments")
    .select("*")
    .eq("user", currentUser.code)
    .eq("group_name", selectedGroup);

  if (existing && existing.length > 0) {
    document.getElementById("error").innerText =
      "You already invested in this group!";
    return;
  }

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

  let { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("name", selectedGroup);

  if (groupError || !groupData || groupData.length === 0) {
    document.getElementById("error").innerText = "Group error";
    return;
  }

  let groupRow = groupData[0];
  let newGroupBalance = groupRow.balance + amount;

  await supabase
    .from("groups")
    .update({ balance: newGroupBalance })
    .eq("id", groupRow.id);

  const { error: insertError } = await supabase
    .from("investments")
    .insert([
      {
        user: currentUser.code,
        group_name: selectedGroup,
        amount: amount,
        created_at: new Date().toISOString()
      }
    ]);

  if (insertError) {
    console.log("Insert error:", insertError);
    document.getElementById("error").innerText = "Database error!";
    return;
  }

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