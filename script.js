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
  const code = document.getElementById("codeInput").value.trim();

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
}

window.login = login;

async function invest(amount) {
  if (!currentUser) return;

  let { data: existing } = await supabase
    .from("investments")
    .select("*")
    .eq("user", currentUser.code)
    .eq("group_name", selectedGroup);

  if (existing.length > 0) {
    document.getElementById("error").innerText =
      "Already invested in this group!";
    return;
  }

  if (currentUser.balance < amount) {
    document.getElementById("error").innerText = "Not enough money!";
    return;
  }

  const newBalance = currentUser.balance - amount;

  await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("code", currentUser.code);

  let { data: groupData } = await supabase
    .from("groups")
    .select("*")
    .eq("name", selectedGroup);

  let group = groupData[0];

  await supabase
    .from("groups")
    .update({ balance: group.balance + amount })
    .eq("id", group.id);

  await supabase.from("investments").insert([
    {
      user: currentUser.code,
      group_name: selectedGroup,
      amount: amount
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