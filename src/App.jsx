import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* === Einstellungen === */
const SHEET_ID = "1T64mmhaI59cfSVxJVNTFpOnHy7uayDod4GLpCNuNoE0";
const SHEET_NAME = "Plan";
/* ===================== */

/* 1RM calculation (Epley RIR-adjusted) */
const calc1RM = (load, reps, rir) => {
  if (!load || isNaN(load) || !reps || isNaN(reps) || rir === "" || isNaN(rir))
    return null;
  return load * (1 + (parseFloat(reps) + parseFloat(rir)) / 30);
};

/* generate mapping for all 36 blocks:
   Schema derived from your sheet: each block uses 19 data rows + 1 blank row = 20 data rows + 1 blank = 21 step
   W1 GK1 starts at row 5 (per your description).
*/
const generateTimeMapping = () => {
  const mapping = [];
  let blockIndex = 1;
  for (let week = 1; week <= 6; week++) {
    for (let gk = 1; gk <= 6; gk++) {
      const start = 5 + (blockIndex - 1) * 21;
      const end = start + 18; // inclusive
      mapping.push({
        start,
        end,
        label: `W${week} GK${gk}`,
      });
      blockIndex++;
    }
  }
  return mapping;
};

const timeMapping = generateTimeMapping();
const getTimeLabel = (rowIndex) => {
  const found = timeMapping.find((m) => rowIndex >= m.start && rowIndex <= m.end);
  return found ? found.label : null;
};

export function App() {
  const [data, setData] = useState([]); // all rows (filtered)
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          SHEET_NAME
        )}`;
        const res = await fetch(url);
        const txt = await res.text();

        // gviz returns JS padding; remove it
        const json = JSON.parse(txt.substring(47).slice(0, -2));
        const rows = json.table.rows || [];

        // Column indices: A=0, B=1, C=2...
        // Update these if your sheet columns differ.
        const colExercise = 0; // "Übung" in Spalte A
        const colLoad = 2;     // "T-Load" in Spalte C
        const colReps = 3;     // "T-Reps" in Spalte D
        const colRir = 4;      // "T-RIR" in Spalte E

        const parsed = rows.map((row, idx) => {
          // row.c may be undefined for empty cells
          const cell = (i) => (row.c && row.c[i] ? row.c[i].v : null);

          const exercise = cell(colExercise);
          const rawLoad = cell(colLoad);
          const rawReps = cell(colReps);
          const rawRir = cell(colRir);

          // parse numbers (T-Load may include "KG" or text; remove non-numeric)
          const load = rawLoad ? parseFloat(String(rawLoad).replace(/[^\d,.\-]/g, "").replace(",", ".")) : NaN;
          const reps = rawReps ? parseFloat(String(rawReps).replace(",", ".")) : NaN;
          const rir = rawRir ? parseFloat(String(rawRir).replace(",", ".")) : NaN;

          const oneRM = calc1RM(load, reps, rir);
          const zeitpunkt = getTimeLabel(idx + 1); // idx is zero-based -> +1 line number

          return { exercise, load, reps, rir, oneRM, zeitpunkt, row: idx + 1 };
        });

        // filter: only keep rows with exercise text, numeric oneRM, and zeitpunkt found
        const filtered = parsed.filter((r) => r.exercise && r.oneRM && r.zeitpunkt);

        // determine last available training block: find max zeitpunkt present
        const allLabels = filtered.map((r) => r.zeitpunkt);
        const uniqueLabels = Array.from(new Set(allLabels));
        // sort labels in natural order using mapping order
        const orderedLabels = timeMapping.map((m) => m.label).filter((l) => uniqueLabels.includes(l));
        // Optionally we could trim data to last label
        const lastLabel = orderedLabels.length ? orderedLabels[orderedLabels.length - 1] : null;
        const finalFiltered = lastLabel ? filtered.filter((r) => orderedLabels.includes(r.zeitpunkt)) : filtered;

        setData(finalFiltered);

        const uniqueExercises = [...new Set(finalFiltered.map((d) => d.exercise))].sort();
        setExercises(uniqueExercises);
      } catch (err) {
        console.error("Fehler beim Laden des Sheets:", err);
        alert("Fehler beim Laden des Google Sheets. Bitte prüfen, ob das Sheet öffentlich ist und der Blattname korrekt ist (Plan).");
      }
    };

    fetchSheet();
  }, []);

  // Filter data for selected exercise and order by mapping index
  const chartData = selectedExercise
    ? data
        .filter((d) => d.exercise === selectedExercise)
        // order by week/day index according to timeMapping
        .sort((a, b) => {
          const ia = timeMapping.findIndex((t) => t.label === a.zeitpunkt);
          const ib = timeMapping.findIndex((t) => t.label === b.zeitpunkt);
          return ia - ib;
        })
        // map for chart readability
        .map((d) => ({ zeitpunkt: d.zeitpunkt, oneRM: Math.round(d.oneRM * 10) / 10 }))
    : [];

  return (
    <div style={{ display: "flex", height: "100vh", padding: 20 }}>
      <div style={{ width: "25%", borderRight: "1px solid #ddd", paddingRight: 16, overflowY: "auto" }}>
        <h2>Übungen</h2>
        {exercises.length === 0 && <div>lade...</div>}
        {exercises.map((ex) => (
          <button key={ex} style={{ display: "block", width: "100%", padding: 8, margin: "6px 0", textAlign: "left" }} onClick={() => setSelectedExercise(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, paddingLeft: 20 }}>
        <h2>{selectedExercise ? `${selectedExercise} – 1RM Verlauf` : "Bitte eine Übung wählen"}</h2>
        {selectedExercise && (
          <>
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zeitpunkt" interval={0} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="oneRM" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 10 }}>
              <strong>Hinweis:</strong> Das Diagramm zeigt **alle** Sätze (nicht nur das Maximum) in chronologischer Reihenfolge, bis zum letzten tatsächlich abtrainierten Trainingstag.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
