// src/components/ProcesamientoAvanzado.tsx
//
// NOTA: Para que este componente funcione, necesitas instalar 2 librerías:
// 1. sheetjs (para leer y escribir Excel)
// 2. file-saver (para descargar el archivo)
//
// Ejecuta en tu terminal:
// npm install xlsx file-saver
// npm install @types/file-saver -D
//
import { useState, useMemo, useRef } from "react";

// --- Dependencias Externas ---
// Las siguientes 2 líneas pueden mostrar un error en la vista previa
// porque las librerías no están instaladas aquí.
// Debes instalarlas en tu proyecto local con: npm install xlsx file-saver
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// --- Importación Local ---
// Esta línea puede mostrar un error si el archivo no existe en la ruta
// esperada (src/api/apiClient.ts) en tu proyecto.
// Esta es la misma ruta que usan tus otros componentes.
import { apiClient } from "../api/apiClient";

// Campos disponibles de la API (mismos que en EditarUsuarioModal)
const CAMPOS_DISPONIBLES = [
  "dni",
  "ap_pat",
  "ap_mat",
  "nombres",
  "fecha_nac",
  "fch_inscripcion",
  "fch_emision",
  "fch_caducidad",
  "ubigeo_nac",
  "ubigeo_dir",
  "direccion",
  "sexo",
  "est_civil",
  "dig_ruc",
  "madre",
  "padre",
];

// Tipo para representar cada fila de datos
type DataRow = {
  [key: string]: any;
  // Nuevas columnas que añadiremos dinámicamente según campos seleccionados
  nombreVerificado?: string;
  fechaVerificada?: string;
  // Estado de procesamiento por fila
  _processing?: boolean;
  _error?: string;
};

export default function ProcesamientoAvanzado() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [dniColumn, setDniColumn] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [error, setError] = useState<string>("");

  // Nuevos estados para el procesamiento por rango
  const [processingMode, setProcessingMode] = useState<'all' | 'range'>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(1);

  // Estado para campos seleccionados (por defecto nombreVerificado y fechaVerificada)
  const [selectedFields, setSelectedFields] = useState<string[]>(["nombreVerificado", "fechaVerificada"]);
  
  // Ref para evitar doble procesamiento
  const isProcessingRef = useRef<boolean>(false);


  // --- 1. Carga del Archivo ---
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      // Resetear estados anteriores
      resetState();
      
      // Leer el archivo para obtener los nombres de las hojas
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const bstr = event.target?.result;
          if (!bstr) {
            setError("No se pudo leer el archivo.");
            return;
          }
          const workbook = XLSX.read(bstr, { type: "binary" });
          setSheetNames(workbook.SheetNames);
          if (workbook.SheetNames.length > 0) {
            // Seleccionar la primera hoja por defecto
            const firstSheet = workbook.SheetNames[0];
            setSelectedSheet(firstSheet);
            loadSheetData(workbook, firstSheet);
          } else {
            setError("El archivo Excel no contiene hojas.");
          }
        } catch (err) {
          console.error(err);
          setError("Error al leer el archivo. Asegúrese de que sea un Excel válido.");
        }
      };
      reader.onerror = () => {
         setError("Error al leer el archivo.");
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  // --- 2. Carga de la Hoja Seleccionada ---
  
  const loadSheetData = (workbook: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        setError(`No se encontró la hoja "${sheetName}" en el archivo.`);
        return;
      }
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        setError("La hoja seleccionada está vacía o no tiene cabeceras.");
        resetState(true); // Mantiene el archivo y hojas, pero limpia datos
        return;
      }

      // Tomar la primera fila como cabeceras
      const rawHeaders = (jsonData[0] as any[]).map(String); // Asegurar que sean strings
      setHeaders(rawHeaders);
      
      // Convertir el resto de filas en objetos
      const parsedData = jsonData.slice(1).map((row: any[]) => {
        const rowData: DataRow = {};
        rawHeaders.forEach((header, index) => {
          rowData[header] = row[index];
        });
        // Añadir estado inicial
        rowData._processing = false;
        // Inicializar todos los campos posibles (nombreVerificado, fechaVerificada y todos los de CAMPOS_DISPONIBLES)
        // Esto evita problemas de sincronización con selectedFields
        ["nombreVerificado", "fechaVerificada", ...CAMPOS_DISPONIBLES].forEach(field => {
          rowData[field] = "";
        });
        return rowData;
      });

      setData(parsedData);
      
      // Actualizar estados de rango
      setRangeStart(1);
      setRangeEnd(parsedData.length);
      setProcessingMode('all'); // Resetear a "toda la hoja"

      // Sugerir la columna de DNI si existe
      const dniHeader = rawHeaders.find(h => h.toLowerCase().trim().includes("dni"));
      if (dniHeader) {
        setDniColumn(dniHeader);
      } else {
        setDniColumn(""); // Resetear si no se encuentra
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar los datos de la hoja.");
      resetState(true);
    }
  };

  // Handler para cuando el usuario cambia la hoja en el <select>
  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSheetName = e.target.value;
    setSelectedSheet(newSheetName);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const bstr = event.target?.result;
          if (!bstr) {
             setError("No se pudo leer el archivo para cambiar de hoja.");
             return;
          }
          const workbook = XLSX.read(bstr, { type: "binary" });
          loadSheetData(workbook, newSheetName);
        } catch (err) {
          setError("Error al cambiar de hoja.");
        }
      };
      reader.onerror = () => {
         setError("Error al leer el archivo.");
      };
      reader.readAsBinaryString(file);
    }
  };
  
  // --- 3. Lógica de Procesamiento ---

  // Memoizar el cálculo del rango a procesar
  const { startIndex, endIndex, totalToProcess } = useMemo(() => {
    if (processingMode === 'range') {
      // El usuario ve filas 1-based, el array es 0-based (fila 1 = data[0])
      const start = Math.max(0, rangeStart - 1);
      // El 'end' del usuario es inclusivo, así que lo usamos como límite (fila 10 = data[9])
      const end = Math.min(data.length, rangeEnd); 
      const total = end - start;
      return { startIndex: start, endIndex: end, totalToProcess: total > 0 ? total : 0 };
    }
    // Modo 'all'
    return { startIndex: 0, endIndex: data.length, totalToProcess: data.length };
  }, [processingMode, rangeStart, rangeEnd, data.length]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleStartProcessing = async () => {
    // Prevenir doble procesamiento
    if (isProcessingRef.current || isProcessing) {
      return;
    }

    if (!dniColumn) {
      setError("Por favor, seleccione la columna que contiene el DNI.");
      return;
    }
    
    if (totalToProcess <= 0) {
      setError("El rango seleccionado no es válido o no contiene filas.");
      return;
    }

    if (selectedFields.length === 0) {
      setError("Por favor, seleccione al menos un campo para procesar.");
      return;
    }

    // Marcar como procesando
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessedCount(0);
    setProgress(0);
    setError("");

    try {
      // Usamos un bucle for...of para procesar secuencialmente con delays
      // Iteramos solo sobre el rango seleccionado (calculado en useMemo)
      for (let i = startIndex; i < endIndex; i++) {
        // Verificar nuevamente si se canceló el procesamiento
        if (!isProcessingRef.current) {
          break;
        }

        const row = data[i]; // Accedemos directamente al índice correcto
        const dni = row[dniColumn];

        // Actualizar estado de la fila a "procesando"
        updateRowState(i, { _processing: true, _error: "" });

        if (!dni || String(dni).trim() === "") {
          updateRowState(i, { _processing: false, _error: "DNI vacío" });
        } else {
          try {
            // Llamada a la API
            const res = await apiClient.get(`/consulta?dni=${String(dni).trim()}`);
            
            const apiData = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;

            if (apiData) {
              // Construir objeto con solo los campos seleccionados
              const rowUpdate: Partial<DataRow> = { _processing: false };
              
              // Procesar cada campo seleccionado
              selectedFields.forEach(field => {
                if (field === "nombreVerificado") {
                  const nombreCompleto = `${apiData.nombres || ''} ${apiData.ap_pat || ''} ${apiData.ap_mat || ''}`.trim();
                  rowUpdate.nombreVerificado = nombreCompleto;
                } else if (field === "fechaVerificada") {
                  rowUpdate.fechaVerificada = apiData.fecha_nac || '';
                } else {
                  // Para otros campos, usar el nombre del campo directamente
                  rowUpdate[field] = apiData[field] || '';
                }
              });
              
              updateRowState(i, rowUpdate);
            } else {
              updateRowState(i, { _processing: false, _error: "No encontrado" });
            }
          } catch (err) {
            console.error(`Error procesando DNI ${dni}:`, err);
            updateRowState(i, { _processing: false, _error: "Error API" });
          }
        }

        // Actualizar progreso
        const newProcessedCount = (i - startIndex) + 1;
        setProcessedCount(newProcessedCount);
        setProgress((newProcessedCount / totalToProcess) * 100);

        // Esperar 500ms antes de la siguiente iteración
        // No esperar en la última iteración
        if (i < endIndex - 1) {
          await delay(500);
        }
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Helper para actualizar una fila específica en el estado de 'data'
  // Usando una función callback para asegurar el estado más reciente
  const updateRowState = (index: number, newState: Partial<DataRow>) => {
    setData(prevData =>
      prevData.map((row, i) =>
        i === index ? { ...row, ...newState } : row
      )
    );
  };

  // --- 4. Descarga del Archivo ---
  
  const handleDownload = () => {
    if (isProcessing) return;

    // Preparar datos para la hoja de Excel
    // 1. Crear las cabeceras, incluyendo solo los campos seleccionados
    const newHeaders = [...headers, ...selectedFields, "estadoProceso"];
    
    // 2. Mapear los datos al formato de array de arrays
    const exportData = data.map(row => {
      const rowData = headers.map(header => row[header]);
      // Añadir solo los campos seleccionados
      selectedFields.forEach(field => {
        rowData.push(row[field] || "");
      });
      rowData.push(row._error || "OK"); // Añadir estado
      return rowData;
    });

    // 3. Juntar cabeceras y datos
    const finalExportData = [newHeaders, ...exportData];

    // 4. Crear la hoja y el libro
    const ws = XLSX.utils.aoa_to_sheet(finalExportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedSheet || "Procesado");

    // 5. Generar el buffer y descargar
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });

    // Convertir string binario a buffer
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; i++) {
      view[i] = wbout.charCodeAt(i) & 0xFF;
    }

    // Usar file-saver
    const originalFileName = file?.name.replace(/\.(xlsx?|xls)$/i, "") || "datos";
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `${originalFileName}_procesado.xlsx`);
  };

  // Handler para toggle de campos seleccionados
  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // --- 5. Helpers y Render ---

  // Resetea el estado, opcionalmente manteniendo el archivo
  const resetState = (keepFile = false) => {
    if (!keepFile) {
      setFile(null);
      setSheetNames([]);
      // Limpiar el input de archivo
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
    setSelectedSheet("");
    setData([]);
    setHeaders([]);
    setDniColumn("");
    setIsProcessing(false);
    setProgress(0);
    setProcessedCount(0);
    // Resetear rango
    setProcessingMode('all');
    setRangeStart(1);
    setRangeEnd(1);
    // Resetear campos seleccionados a valores por defecto
    setSelectedFields(["nombreVerificado", "fechaVerificada"]);
    // Resetear ref de procesamiento
    isProcessingRef.current = false;
  };
  
  // Memoizar las columnas nuevas basadas en campos seleccionados
  const newColumns = useMemo(() => selectedFields, [selectedFields]);
  
  const canProcess = totalToProcess > 0 && !isProcessing;
  const canDownload = data.length > 0 && !isProcessing && processedCount > 0;

  return (
    // CAMBIO: Se eliminó max-w-7xl y mx-auto para ocupar el ancho completo
    <div className="bg-white/30 backdrop-blur-lg shadow-xl rounded-2xl p-6 md:p-8 w-full space-y-6">
      
      {/* --- Título --- */}
      <h2 className="text-2xl font-bold text-center text-gray-900">
        Procesamiento Avanzado de Datos
      </h2>

      {/* --- Sección 1: Carga y Configuración --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Columna 1: Carga de Archivo */}
        <div className="space-y-2">
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-800">
            1. Cargar archivo Excel
          </label>
          <input
            id="file-input"
            type="file"
            accept=".xls, .xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-gray-900 file:text-white
              hover:file:bg-gray-800 file:transition
              bg-white/60 rounded-lg border border-white/30 cursor-pointer"
          />
        </div>

        {/* Columna 2: Seleccionar Hoja */}
        <div className="space-y-2">
          <label htmlFor="sheet-select" className="block text-sm font-medium text-gray-800">
            2. Seleccionar hoja
          </label>
          <select
            id="sheet-select"
            value={selectedSheet}
            onChange={handleSheetChange}
            disabled={sheetNames.length === 0}
            className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 disabled:opacity-50"
          >
            <option value="" disabled>-- Seleccione una hoja --</option>
            {sheetNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* Columna 3: Seleccionar Columna DNI */}
        <div className="space-y-2">
          <label htmlFor="dni-select" className="block text-sm font-medium text-gray-800">
            3. Seleccionar columna DNI
          </label>
          <select
            id="dni-select"
            value={dniColumn}
            onChange={(e) => setDniColumn(e.target.value)}
            disabled={headers.length === 0}
            className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 disabled:opacity-50"
          >
            <option value="" disabled>-- Seleccione columna --</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- NUEVA SECCIÓN: Opciones de Rango --- */}
      {data.length > 0 && (
        <div className="bg-white/30 p-4 rounded-lg border border-white/30 space-y-3">
          <h3 className="text-sm font-medium text-gray-800">4. Opciones de Procesamiento</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Opción 1: Toda la hoja */}
            <div className="flex items-center">
              <input
                id="mode-all"
                name="processing-mode"
                type="radio"
                value="all"
                checked={processingMode === 'all'}
                onChange={() => setProcessingMode('all')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="mode-all" className="ml-2 block text-sm text-gray-900">
                Procesar toda la hoja ({data.length} filas)
              </label>
            </div>
            {/* Opción 2: Rango */}
            <div className="flex items-center">
              <input
                id="mode-range"
                name="processing-mode"
                type="radio"
                value="range"
                checked={processingMode === 'range'}
                onChange={() => setProcessingMode('range')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="mode-range" className="ml-2 block text-sm text-gray-900">
                Procesar rango específico
              </label>
            </div>
          </div>
          {/* Inputs de Rango */}
          {processingMode === 'range' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 sm:pl-6">
              <div className="space-y-1">
                <label htmlFor="range-start" className="block text-xs font-medium text-gray-700">
                  Desde fila (Excel)
                </label>
                <input
                  type="number"
                  id="range-start"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Math.max(1, Number(e.target.value)))}
                  min="1"
                  max={data.length}
                  className="w-full sm:w-32 p-2 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="range-end" className="block text-xs font-medium text-gray-700">
                  Hasta fila (Excel)
                </label>
                <input
                  type="number"
                  id="range-end"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Math.min(data.length, Number(e.target.value)))}
                  min={rangeStart}
                  max={data.length}
                  className="w-full sm:w-32 p-2 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- NUEVA SECCIÓN: Selección de Campos --- */}
      {data.length > 0 && (
        <div className="bg-white/30 p-4 rounded-lg border border-white/30 space-y-3">
          <h3 className="text-sm font-medium text-gray-800">5. Campos permitidos en API:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-800">
            {/* Campos especiales (nombreVerificado y fechaVerificada) */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.includes("nombreVerificado")}
                onChange={() => toggleField("nombreVerificado")}
                className="rounded text-blue-600 focus:ring-blue-400"
              />
              <span className="select-none">nombreVerificado</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.includes("fechaVerificada")}
                onChange={() => toggleField("fechaVerificada")}
                className="rounded text-blue-600 focus:ring-blue-400"
              />
              <span className="select-none">fechaVerificada</span>
            </label>
            {/* Resto de campos de la API */}
            {CAMPOS_DISPONIBLES.map((campo) => (
              <label key={campo} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(campo)}
                  onChange={() => toggleField(campo)}
                  className="rounded text-blue-600 focus:ring-blue-400"
                />
                <span className="select-none">{campo}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* --- Sección 3: Botones de Acción y Progreso --- */}
      {error && (
        <p className="text-center text-red-700 font-medium bg-red-100 p-3 rounded-lg border border-red-300">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleStartProcessing}
            disabled={!canProcess}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* CAMBIO: Usar totalToProcess en lugar de totalRows */}
            {isProcessing ? `Procesando... (${processedCount}/${totalToProcess})` : "Iniciar Procesamiento"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className="flex-1 bg-green-700 text-white py-3 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Descargar Excel Procesado
          </button>
        </div>

        {/* Barra de Progreso */}
        {isProcessing && (
          <div className="w-full bg-white/40 rounded-full h-2.5 border border-white/30">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* --- Sección 4: Tabla de Datos --- */}
      {data.length > 0 && (
        <div className="overflow-x-auto bg-white/20 p-4 rounded-lg border border-white/30 max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-300/50">
            <thead className="bg-white/30 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                {/* Cabeceras Originales */}
                {headers.map(header => (
                  <th
                    key={header}
                    scope="col"
                    className={`py-3.5 px-3 text-left text-sm font-semibold text-gray-900 ${header === dniColumn ? 'bg-blue-200/50' : ''}`}
                  >
                    {header}
                  </th>
                ))}
                {/* Cabeceras Nuevas */}
                {newColumns.map(header => (
                   <th
                    key={header}
                    scope="col"
                    className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 bg-green-200/50"
                  >
                    {header}
                  </th>
                ))}
                {/* Columna de Estado */}
                <th
                  scope="col"
                  className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 bg-yellow-200/50"
                >
                  estadoProceso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/30">
              {data.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`transition-colors ${row._processing ? 'bg-blue-100/50 animate-pulse' : 'bg-white/10'} ${row._error ? 'bg-red-100/50' : ''}`}
                >
                  {/* Datos Originales */}
                  {headers.map((header, colIndex) => (
                    <td key={`${rowIndex}-${colIndex}`} className="whitespace-nowrap px-3 py-3 text-sm text-gray-800">
                      {String(row[header] === undefined || row[header] === null ? '' : row[header])}
                    </td>
                  ))}
                  {/* Datos Nuevos - Solo mostrar campos seleccionados */}
                  {newColumns.map((field) => (
                    <td key={field} className="whitespace-nowrap px-3 py-3 text-sm text-gray-900 font-medium">
                      {row[field] || ""}
                    </td>
                  ))}
                  {/* Columna de Estado */}
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                    {row._error ? (
                      <span className="text-red-700">{row._error}</span>
                    ) : (
                      <span className="text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}