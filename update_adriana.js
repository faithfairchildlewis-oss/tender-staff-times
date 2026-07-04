const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  const { data: rows, error } = await supabase
    .from('schedules')
    .select('id, data')
    .eq('start_date', '2026-07-06')
    .single();

  if (error) {
    console.error('Fetch error:', error);
    process.exit(1);
  }

  const data = rows.data;
  const friday = data.days[4];

  // Update staff.Adriana
  data.staff.Adriana.hours = 30.5;
  data.staff.Adriana.daily_breaks.Friday = {
    type: "lunch",
    duration: "60 min",
    time: "12:00 PM – 1:00 PM"
  };

  // Update staff_daily for Friday
  const fridaySlots = [
    { time: "7:00 AM", rooms: ["M.O.D."] },
    { time: "7:30 AM", rooms: ["M.O.D."] },
    { time: "8:00 AM", rooms: ["M.O.D."] },
    { time: "8:30 AM", rooms: ["M.O.D."] },
    { time: "9:00 AM", rooms: ["M.O.D."] },
    { time: "9:30 AM", rooms: ["M.O.D."] },
    { time: "10:00 AM", rooms: ["M.O.D."] },
    { time: "10:30 AM", rooms: ["M.O.D."] },
    { time: "11:00 AM", rooms: ["M.O.D."] },
    { time: "11:30 AM", rooms: ["M.O.D."] },
    { time: "1:00 PM", rooms: ["M.O.D."] },
    { time: "1:30 PM", rooms: ["M.O.D."] },
    { time: "2:00 PM", rooms: ["M.O.D."] },
    { time: "2:30 PM", rooms: ["M.O.D."] },
    { time: "3:00 PM", rooms: ["M.O.D."] },
    { time: "3:30 PM", rooms: ["M.O.D."] },
  ];
  data.staff_daily.Adriana.Friday = fridaySlots;

  // Update Friday day slots - add Adriana to M.O.D.
  const coveredTimes = new Set([
    "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM"
  ]);

  for (const slot of friday.slots) {
    if (coveredTimes.has(slot.time)) {
      if (!slot.assignments["M.O.D."].includes("Adriana")) {
        slot.assignments["M.O.D."].push("Adriana");
      }
    }
  }

  // Recalculate understaffed for Friday
  for (const slot of friday.slots) {
    const understaffed = [];
    for (const room of Object.keys(slot.minimums)) {
      const minNeeded = slot.minimums[room];
      const assigned = slot.assignments[room];
      const count = assigned === null ? 0 : assigned.length;
      if (count < minNeeded) {
        understaffed.push(room);
      }
    }
    slot.understaffed = understaffed;
  }

  const { error: updErr } = await supabase
    .from('schedules')
    .update({ data, updated_at: new Date().toISOString() })
    .eq('id', rows.id);

  if (updErr) {
    console.error('Update error:', updErr);
    process.exit(1);
  }

  console.log('Updated successfully');
}

main().catch(e => { console.error(e); process.exit(1); });
