import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// CSS-Stile sind jetzt direkt hier in der Komponente
const AppStyles = () => (
  <style>{`
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f4f7f6;
    }

    .app-container {
      display: flex;
      height: 100vh;
    }

    .sidebar {
      width: 280px;
      background-color: #ffffff;
      border-right: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 2px 0 5px rgba(0,0,0,0.05);
    }

    .sidebar h2 {
      margin-top: 0;
      color: #333;
    }

    .sidebar ul {
      list-style-type: none;
      padding: 0;
      margin: 0;
    }

    .sidebar li {
      padding: 12px 15px;
      cursor: pointer;
      border-radius: 8px;
      margin-bottom: 5px;
      transition: background-color 0.2s, color 0.2s;
    }

    .sidebar li.active {
      background-color: #8884d8;
      color: white;
      font-weight: bold;
    }

    .sidebar li:not(.active):hover {
      background-color: #f0f0f0;
    }
    
    .sidebar p {
      color: #666;
    }

    .main-content {
      flex-grow: 1;
      padding: 30px;
      overflow-y: auto;
    }
    
    .main-content h1 {
        margin-top: 0;
    }
    
    .chart-container {
      width: 100%;
      height: 400px;
      margin-bottom: 40px;
    }

    .records-table {
      margin-top: 40px;
    }

    .records-table table {
      width: 100%;
      border-collapse: collapse;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .records-table th, .records-table td {
      border-bottom: 1px solid #ddd;
      padding: 12px 15px;
      text-align: left;
    }

    .records-table th {
      background-color: #f8f8f8;
      font-weight: bold;
    }
    
    .records-table tbody tr:hover {
      background-color: #f5f5f5;
    }

    .placeholder {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
      color: #888;
      flex-direction: column;
    }
    
    .error-message {
      color: #d9534f;
      background-color: #f2dede;
      border: 1px solid #ebccd1;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      text-align: center;
    }
  `}</style>
);


function App() {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Zustand für Fehlermeldungen

  // Die Epley-Formel zur Berechnung des 1RM
  const calculateOneRepMax = (weight, reps) => {
    if (reps === 1) return weight;
    if (reps === 0) return 0;
    return weight * (1 + reps / 30);
  };

  useEffect(() => {
    // =====================================================================================
    // HIER DEINEN GOOGLE SHEET CSV-LINK EINFÜGEN
    // Gehe in Google Sheets auf Datei -> Freigeben -> Im Web veröffentlichen
    // Wähle das richtige Tabellenblatt und als Format "Kommagetrennte Werte (.csv)"
    // =====================================================================================
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDu2vNtDYtDmRQGM4wB4m0O49Ups3YsEcIfq4TBIzLjQICIWIQD7e97s18vxZCtGtk7X17r4adq9PG/pub?gid=506420951&single=true&output=csv';

    const loadExercises = async () => {
      if (GOOGLE_SHEET_URL.includes('DEIN_KOPIERTER_GOOGLE_SHEET_CSV_LINK')) {
        const errorMessage = "Aktion erforderlich: Bitte fügen Sie Ihren Google Sheet CSV-Link im Code ein.";
        console.error(errorMessage);
        setError(errorMessage); // Fehlermeldung für die UI setzen
        setIsLoading(false);
        return;
      }
      setError(null); // Fehler zurücksetzen, falls Link vorhanden ist
      
      try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) {
          throw new Error(`Netzwerk-Antwort war nicht ok: ${response.statusText}`);
        }
        const csvText = await response.text();
        
        const rows = csvText.trim().split('\n').slice(1);
        const exercisesMap = new Map();

        rows.forEach((row) => {
          const columns = row.split(',');
          if (columns.length < 4) return; 

          const name = columns[0].trim();
          const date = columns[1].trim();
          const weight = parseFloat(columns[2]);
          const reps = parseInt(columns[3], 10);
          
          if (!name || !date || isNaN(weight) || isNaN(reps)) {
            return; 
          }

          const record = { date, weight, reps };

          if (exercisesMap.has(name)) {
            exercisesMap.get(name).records.push(record);
          } else {
            exercisesMap.set(name, {
              id: exercisesMap.size + 1,
              name: name,
              records: [record]
            });
          }
        });

        const formattedExercises = Array.from(exercisesMap.values());
        setExercises(formattedExercises);
        
        if (formattedExercises.length > 0) {
          setSelectedExercise(formattedExercises[0]);
        }

      } catch (error) {
        console.error("Fehler beim Laden oder Verarbeiten der Google Sheet-Daten:", error);
        setError("Daten konnten nicht geladen werden. Bitte Link und Freigabe prüfen.");
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, []);

  const chartData = selectedExercise?.records.map(record => ({
    ...record,
    oneRepMax: parseFloat(calculateOneRepMax(record.weight, record.reps).toFixed(2))
  })).sort((a, b) => new Date(a.date.split('.').reverse().join('-')) - new Date(b.date.split('.').reverse().join('-')));


  return (
    <>
      <AppStyles />
      <div className="app-container">
        <div className="sidebar">
          <h2>Übungen</h2>
          {isLoading ? (
            <p>Lade...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <ul>
              {exercises.map(exercise => (
                <li 
                  key={exercise.id} 
                  className={selectedExercise?.id === exercise.id ? 'active' : ''}
                  onClick={() => setSelectedExercise(exercise)}
                >
                  {exercise.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="main-content">
          {selectedExercise ? (
            <>
              <h1>{selectedExercise.name}</h1>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: '1RM (kg)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value} kg`} />
                    <Legend />
                    <Line type="monotone" dataKey="oneRepMax" name="Geschätztes 1RM" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="records-table">
                <h3>Letzte Einträge</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Gewicht (kg)</th>
                      <th>Wdh.</th>
                      <th>Geschätztes 1RM (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedExercise.records].reverse().map((record, index) => (
                      <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.weight}</td>
                        <td>{record.reps}</td>
                        <td>{calculateOneRepMax(record.weight, record.reps).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="placeholder">
              <h2>Willkommen!</h2>
               {isLoading ? (
                <p>Daten werden geladen...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : (
                <p>Wähle eine Übung aus, um deine Fortschritte zu sehen.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;

