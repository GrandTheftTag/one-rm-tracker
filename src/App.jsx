import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Hilfsfunktion zur Berechnung des 1RM nach der Epley-Formel
const calculate1RM = (weight, reps) => {
  if (reps === 1) return weight;
  if (reps === 0) return 0;
  return weight * (1 + reps / 30);
};

// Styling-Komponente, um CSS in der JSX-Datei zu halten
const AppStyles = () => (
  <style>{`
    :root {
      --bg-color: #1a1a1a;
      --sidebar-bg: #242424;
      --content-bg: #2c2c2c;
      --text-color: #e0e0e0;
      --primary-color: #4a90e2;
      --border-color: #444;
      --hover-bg: #333;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      background-color: var(--bg-color);
      color: var(--text-color);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    #root {
      display: flex;
      flex-grow: 1;
    }
    .app-container {
      display: flex;
      width: 100%;
      height: 100%;
    }
    .sidebar {
      width: 280px;
      background-color: var(--sidebar-bg);
      padding: 20px;
      border-right: 1px solid var(--border-color);
      overflow-y: auto;
    }
    .sidebar h2 {
      margin-top: 0;
      color: var(--primary-color);
    }
    .exercise-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .exercise-list-item button {
      width: 100%;
      padding: 12px 15px;
      margin-bottom: 8px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--content-bg);
      color: var(--text-color);
      cursor: pointer;
      text-align: left;
      font-size: 1rem;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .exercise-list-item button:hover {
      background-color: var(--hover-bg);
    }
    .exercise-list-item button.selected {
      background-color: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }
    .main-content {
      flex-grow: 1;
      padding: 30px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .welcome-message, .loading-message, .error-message {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-size: 1.5rem;
      color: #888;
    }
    .error-message {
      color: #e24a4a;
      text-align: center;
      white-space: pre-wrap;
    }
    .exercise-details h1 {
      margin-top: 0;
      color: var(--primary-color);
    }
    .chart-container {
      width: 100%;
      height: 400px;
      background-color: var(--sidebar-bg);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .records-table {
      width: 100%;
      border-collapse: collapse;
    }
    .records-table th, .records-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
    }
    .records-table th {
      background-color: var(--hover-bg);
    }
  `}</style>
);

function App() {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDu2vNtDYtDmRQGM4wB4m0O49Ups3YsEcIfq4TBIzLjQICIWIQD7e97s18vxZCtGtk7X17r4adq9PG/pub?gid=50642095_user_says:&single=true&output=csv';

    const loadExercises = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) {
          throw new Error(`Netzwerk-Antwort war nicht ok. Status: ${response.status}`);
        }
        const csvText = await response.text();
        
        const rows = csvText.trim().split('\n').slice(1);
        if (rows.length === 0) {
           setExercises([]);
           return;
        }

        const exercisesMap = new Map();
        rows.forEach((row) => {
          const [name, date, weight, reps] = row.split(',').map(s => s.trim());
          if (!name || !date || !weight || !reps) return;

          const record = {
            date,
            weight: parseFloat(weight),
            reps: parseInt(reps, 10),
          };

          if (exercisesMap.has(name)) {
            exercisesMap.get(name).records.push(record);
          } else {
            exercisesMap.set(name, {
              id: exercisesMap.size + 1,
              name: name,
              records: [record],
            });
          }
        });

        const formattedExercises = Array.from(exercisesMap.values());
        formattedExercises.forEach(ex => {
            // Konvertiert das Datum von TT.MM.JJJJ zu JJJJ-MM-TT für eine korrekte Sortierung
            ex.records.sort((a, b) => new Date(a.date.split('.').reverse().join('-')) - new Date(b.date.split('.').reverse().join('-')));
        });
        
        setExercises(formattedExercises);

      } catch (err) {
        console.error("Fehler beim Laden oder Verarbeiten der Google Sheet-Daten:", err);
        setError(`Fehler beim Laden der Daten. Bitte prüfen Sie die URL und die Internetverbindung.\nDetails: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, []);

  const chartData = selectedExercise?.records.map(record => ({
    date: record.date,
    '1RM': parseFloat(calculate1RM(record.weight, record.reps).toFixed(2)),
  }));

  return (
    <>
      <AppStyles />
      <div className="app-container">
        <aside className="sidebar">
          <h2>Übungen</h2>
          {isLoading ? (
            <div className="loading-message">Lade...</div>
          ) : (
            <ul className="exercise-list">
              {exercises.map(ex => (
                <li key={ex.id} className="exercise-list-item">
                  <button
                    onClick={() => setSelectedExercise(ex)}
                    className={selectedExercise?.id === ex.id ? 'selected' : ''}
                  >
                    {ex.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <main className="main-content">
          {error ? (
             <div className="error-message">{error}</div>
          ) : !selectedExercise ? (
            <div className="welcome-message">Wähle eine Übung aus, um Details zu sehen.</div>
          ) : (
            <div className="exercise-details">
              <h1>{selectedExercise.name}</h1>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                    <XAxis dataKey="date" stroke="#e0e0e0" />
                    <YAxis stroke="#e0e0e0" />
                    <Tooltip contentStyle={{ backgroundColor: '#242424', border: '1px solid #444' }} />
                    <Legend />
                    <Line type="monotone" dataKey="1RM" stroke="#4a90e2" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <h2>Verlauf</h2>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Gewicht (kg)</th>
                    <th>Wdh.</th>
                    <th>Geschätztes 1RM (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExercise.records.map((record, index) => (
                    <tr key={index}>
                      <td>{record.date}</td>
                      <td>{record.weight}</td>
                      <td>{record.reps}</td>
                      <td>{calculate1RM(record.weight, record.reps).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;

