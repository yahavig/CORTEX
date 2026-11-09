// Apple Reminders via osascript. Reminders sync to the iPhone through iCloud.
// Values go in as argv, never interpolated into the script.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const LIST = 'CORTEX';

async function osa(script: string, args: string[]) {
  const { stdout } = await run('osascript', ['-e', script, ...args], { timeout: 30_000 });
  return stdout.trim();
}

const ENSURE_LIST = `
  if not (exists list "${LIST}") then make new list with properties {name:"${LIST}"}
`;

// Date is passed as separate components to avoid locale-dependent parsing.
const CREATE = `
on run argv
  set {theName, theBody, y, mo, d, h, mi} to argv
  tell application "Reminders"
    ${ENSURE_LIST}
    set dt to current date
    set day of dt to 1
    set year of dt to (y as integer)
    set month of dt to (mo as integer)
    set day of dt to (d as integer)
    set time of dt to ((h as integer) * 3600 + (mi as integer) * 60)
    set r to make new reminder at end of list "${LIST}" with properties {name:theName, body:theBody, remind me date:dt}
    return id of r
  end tell
end run`;

const DELETE = `
on run argv
  tell application "Reminders"
    try
      delete (first reminder whose id is (item 1 of argv))
    end try
  end tell
end run`;

const COMPLETE = `
on run argv
  tell application "Reminders"
    try
      set completed of (first reminder whose id is (item 1 of argv)) to true
    end try
  end tell
end run`;

export async function createReminder(name: string, body: string, at: Date): Promise<string> {
  const parts = [at.getFullYear(), at.getMonth() + 1, at.getDate(), at.getHours(), at.getMinutes()].map(String);
  return osa(CREATE, [name, body, ...parts]);
}

export async function deleteReminder(id: string) {
  await osa(DELETE, [id]);
}

export async function completeReminder(id: string) {
  await osa(COMPLETE, [id]);
}
