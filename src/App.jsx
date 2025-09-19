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
      display: flex;
      flex-direction: column;
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
    .welcome-message, .loading-message, .error-message, .no-data-message {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
      padding: 20px;
      font-size: 1.2rem;
      color: #888;
      flex-grow: 1;
    }
    .error-message {
      color: #e24a4a;
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
    const originalUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDu2vNtDYtDmRQGM4wB4m0O49Ups3YsEcIfq4TBIzLjQICIWIQD7e97s18vxZCtGtk7X17r4adq9PG/pub?gid=506420951&single=true&output=csv';
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const GOOGLE_SHEET_URL = `${proxyUrl}${encodeURIComponent(originalUrl)}`;

    const loadExercises = async () => {
      setIsLoading(true);
      setError(null);
      console.log('Lade Daten von:', GOOGLE_SHEET_URL);
      try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) {
          throw new Error(`Netzwerk-Antwort war nicht ok. Status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log('Rohdaten empfangen:', csvText);

        if (!csvText || csvText.trim() === '') {
            throw new Error('Die empfangenen Daten sind leer. Bitte prüfen Sie die Google Sheet URL und Freigabe.');
        }
        
        const rows = csvText.trim().split(/\r?\n/).slice(1);
        console.log(`Daten in ${rows.length} Zeilen aufgeteilt (ohne Kopfzeile).`);
        
        if (rows.length === 0) {
           setExercises([]);
           return;
        }

        const exercisesMap = new Map();
        let invalidRowCount = 0;
        rows.forEach((row, index) => {
          if (row.trim() === '') return;
          // KORREKTUR: Das Trennzeichen wurde auf Semikolon (;) geändert, was für deutsche CSV-Exporte üblich ist.
          const columns = row.split(';').map(s => s.trim());
          
          if (columns.length < 4 || columns.slice(0, 4).some(c => c === '')) {
            console.warn(`Zeile ${index + 2} wird übersprungen (ungültiges Format): "${row}"`);
            invalidRowCount++;
            return;
          }

          const [name, date, weight, reps] = columns;
          const record = { date, weight: parseFloat(weight), reps: parseInt(reps, 10) };

          if (exercisesMap.has(name)) {
            exercisesMap.get(name).records.push(record);
          } else {
            exercisesMap.set(name, { id: exercisesMap.size + 1, name, records: [record] });
          }
        });

        console.log(`Verarbeitung abgeschlossen. ${exercisesMap.size} Übungen gefunden. ${invalidRowCount} Zeilen übersprungen.`);
        
        const formattedExercises = Array.from(exercisesMap.values());
        if (formattedExercises.length === 0 && rows.length > 0) {
            throw new Error(`Daten wurden geladen, aber es konnten keine gültigen Übungen extrahiert werden. Bitte prüfen Sie das Spaltenformat in Ihrem Google Sheet.`);
        }

        formattedExercises.forEach(ex => {
            ex.records.sort((a, b) => new Date(a.date.split('.').reverse().join('-')) - new Date(b.date.split('.').reverse().join('-')));
        });
        
        setExercises(formattedExercises);
        if (formattedExercises.length > 0) {
          setSelectedExercise(formattedExercises[0]);
        }

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

  const renderSidebarContent = () => {
    if (isLoading) return <div className="loading-message">Lade...</div>;
    if (error) return <div className="error-message">Fehler beim Laden.</div>;
    if (exercises.length === 0) return <div className="no-data-message">Keine Übungen gefunden.</div>;

    return (
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
    );
  };

  const renderMainContent = () => {
    if (isLoading) return null; // Hauptinhalt wird erst nach dem Laden angezeigt
    if (error) return <div className="error-message">{error}</div>;
    if (!selectedExercise) return <div className="welcome-message">Wähle eine Übung aus, um Details zu sehen.</div>;

    return (
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
    );
  };

  return (
    <>
      <AppStyles />
      <div className="app-container">
        <aside className="sidebar">
          <h2>Übungen</h2>
          {renderSidebarContent()}
        </aside>
        <main className="main-content">
          {renderMainContent()}
        </main>
      </div>
    </>
  );
}

export default App;

